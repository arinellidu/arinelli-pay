package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Dispatcher entrega eventos do outbox (I2): o core Java decide e grava; aqui
// só se executa a consequência. charge.settled → invoice PAID + paid_at (I7).
type Dispatcher struct {
	Pool      *pgxpool.Pool
	Log       *slog.Logger
	Tick      time.Duration
	BatchSize int
	// OnProcessed é hook de teste (contagem de processamento único); nil em produção.
	OnProcessed func(eventID int64)
}

type outboxRow struct {
	ID          int64
	Aggregate   string
	AggregateID int64
	Type        string
	Payload     []byte
	Attempts    int32
}

type chargeSettledPayload struct {
	ChargeID  int64  `json:"chargeId"`
	InvoiceID int64  `json:"invoiceId"`
	E2EID     string `json:"e2eId"`
}

// Run processa lotes a cada tick até o contexto morrer (graceful shutdown).
func (d *Dispatcher) Run(ctx context.Context) {
	ticker := time.NewTicker(d.Tick)
	defer ticker.Stop()
	d.Log.Info("dispatcher up", "tick", d.Tick.String(), "batch", d.BatchSize)
	for {
		select {
		case <-ctx.Done():
			d.Log.Info("dispatcher stopped")
			return
		case <-ticker.C:
			// drena: enquanto vier lote cheio, continua sem esperar o próximo tick
			for {
				n, err := d.ProcessBatch(ctx)
				if err != nil {
					if ctx.Err() == nil {
						d.Log.Error("batch failed", "err", err)
					}
					break
				}
				if n < d.BatchSize {
					break
				}
			}
		}
	}
}

// ProcessBatch trava até BatchSize eventos com FOR UPDATE SKIP LOCKED (vários
// workers competem sem duplicar), processa cada um e commita o lote inteiro.
// Falha de um evento vira attempts+1 (backoff exponencial), sem derrubar o lote.
func (d *Dispatcher) ProcessBatch(ctx context.Context) (int, error) {
	tx, err := d.Pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin: %w", err)
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, `
		SELECT id, aggregate, aggregate_id, type, payload, attempts
		  FROM outbox_events
		 WHERE processed_at IS NULL
		   AND (attempts = 0 OR created_at + make_interval(secs => LEAST(power(2, attempts), 300)) <= now())
		 ORDER BY id
		 FOR UPDATE SKIP LOCKED
		 LIMIT $1`, d.BatchSize)
	if err != nil {
		return 0, fmt.Errorf("select batch: %w", err)
	}
	events, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (outboxRow, error) {
		var e outboxRow
		err := row.Scan(&e.ID, &e.Aggregate, &e.AggregateID, &e.Type, &e.Payload, &e.Attempts)
		return e, err
	})
	if err != nil {
		return 0, fmt.Errorf("scan batch: %w", err)
	}
	if len(events) == 0 {
		return 0, tx.Commit(ctx)
	}

	for _, event := range events {
		if err := d.handle(ctx, tx, event); err != nil {
			d.Log.Error("event failed", "id", event.ID, "type", event.Type, "attempts", event.Attempts+1, "err", err)
			if _, uerr := tx.Exec(ctx,
				`UPDATE outbox_events SET attempts = attempts + 1 WHERE id = $1`, event.ID); uerr != nil {
				return 0, fmt.Errorf("bump attempts: %w", uerr)
			}
			continue
		}
		if _, uerr := tx.Exec(ctx,
			`UPDATE outbox_events SET processed_at = now() WHERE id = $1`, event.ID); uerr != nil {
			return 0, fmt.Errorf("mark processed: %w", uerr)
		}
		if d.OnProcessed != nil {
			d.OnProcessed(event.ID)
		}
		d.Log.Info("event processed", "id", event.ID, "type", event.Type, "aggregate_id", event.AggregateID)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit: %w", err)
	}
	return len(events), nil
}

func (d *Dispatcher) handle(ctx context.Context, tx pgx.Tx, event outboxRow) error {
	switch event.Type {
	case "charge.settled":
		var payload chargeSettledPayload
		if err := json.Unmarshal(event.Payload, &payload); err != nil {
			return fmt.Errorf("payload inválido: %w", err)
		}
		if payload.InvoiceID == 0 {
			return errors.New("payload sem invoiceId")
		}
		// I7: fatura só vira PAID aqui, consumindo charge.settled do outbox
		tag, err := tx.Exec(ctx, `
			UPDATE invoices
			   SET status = 'PAID', paid_at = COALESCE(paid_at, now())
			 WHERE id = $1 AND status <> 'PAID'`, payload.InvoiceID)
		if err != nil {
			return fmt.Errorf("update invoice: %w", err)
		}
		if tag.RowsAffected() == 0 {
			d.Log.Info("invoice já PAID (evento idempotente)", "invoice_id", payload.InvoiceID, "event_id", event.ID)
		}
		return nil
	default:
		return fmt.Errorf("tipo desconhecido: %s", event.Type)
	}
}
