package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

// Aceite do P04: 3 workers concorrentes, 100 eventos, nenhum processado duas vezes.
func TestDispatcherConcurrencyNoDoubleProcessing(t *testing.T) {
	if testing.Short() {
		t.Skip("precisa de docker")
	}
	ctx := context.Background()

	container, err := postgres.Run(ctx, "postgres:17-alpine",
		postgres.WithDatabase("pay"),
		postgres.WithUsername("pay"),
		postgres.WithPassword("pay"),
		postgres.BasicWaitStrategies(),
	)
	if err != nil {
		t.Fatalf("container: %v", err)
	}
	t.Cleanup(func() { _ = container.Terminate(context.Background()) })

	connString, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("connString: %v", err)
	}

	applyBaseline(t, ctx, connString)

	pool, err := pgxpool.New(ctx, connString)
	if err != nil {
		t.Fatalf("pool: %v", err)
	}
	defer pool.Close()

	seed(t, ctx, pool, 100)

	// contagem de processamento por evento — o hook roda dentro do lote
	var mu sync.Mutex
	counts := map[int64]int{}
	onProcessed := func(id int64) {
		mu.Lock()
		counts[id]++
		mu.Unlock()
	}

	runCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	var wg sync.WaitGroup
	for i := 0; i < 3; i++ {
		workerPool, err := pgxpool.New(ctx, connString)
		if err != nil {
			t.Fatalf("worker pool %d: %v", i, err)
		}
		defer workerPool.Close()
		d := &Dispatcher{
			Pool:        workerPool,
			Log:         slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelWarn})),
			Tick:        50 * time.Millisecond,
			BatchSize:   10,
			OnProcessed: onProcessed,
		}
		wg.Add(1)
		go func() { defer wg.Done(); d.Run(runCtx) }()
	}

	deadline := time.Now().Add(60 * time.Second)
	for {
		var pending int
		if err := pool.QueryRow(ctx,
			`SELECT count(*) FROM outbox_events WHERE processed_at IS NULL`).Scan(&pending); err != nil {
			t.Fatalf("pending: %v", err)
		}
		if pending == 0 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("timeout: %d eventos pendentes", pending)
		}
		time.Sleep(100 * time.Millisecond)
	}
	cancel()
	wg.Wait()

	mu.Lock()
	defer mu.Unlock()
	if len(counts) != 100 {
		t.Fatalf("processados %d eventos distintos, esperado 100", len(counts))
	}
	for id, n := range counts {
		if n != 1 {
			t.Fatalf("evento %d processado %d vezes", id, n)
		}
	}

	var paid int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM invoices WHERE status = 'PAID' AND paid_at IS NOT NULL`).Scan(&paid); err != nil {
		t.Fatalf("paid: %v", err)
	}
	if paid != 100 {
		t.Fatalf("faturas PAID = %d, esperado 100 (I7)", paid)
	}

	// evento venenoso: tipo desconhecido incrementa attempts e não marca processed_at
	if _, err := pool.Exec(ctx, `
		INSERT INTO outbox_events (aggregate, aggregate_id, type, payload)
		VALUES ('charge', 999, 'tipo.desconhecido', '{}'::jsonb)`); err != nil {
		t.Fatalf("poison insert: %v", err)
	}
	single := &Dispatcher{Pool: pool, Log: slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError})), Tick: time.Second, BatchSize: 10}
	if _, err := single.ProcessBatch(ctx); err != nil {
		t.Fatalf("poison batch: %v", err)
	}
	var attempts int
	var processed *time.Time
	if err := pool.QueryRow(ctx,
		`SELECT attempts, processed_at FROM outbox_events WHERE type = 'tipo.desconhecido'`).Scan(&attempts, &processed); err != nil {
		t.Fatalf("poison check: %v", err)
	}
	if attempts != 1 || processed != nil {
		t.Fatalf("backoff quebrado: attempts=%d processed=%v", attempts, processed)
	}
}

func applyBaseline(t *testing.T, ctx context.Context, connString string) {
	t.Helper()
	sql, err := os.ReadFile("../../infra/migrations/0001_baseline.sql")
	if err != nil {
		t.Fatalf("baseline: %v", err)
	}
	// simple protocol para executar o arquivo inteiro (múltiplos statements)
	cfg, err := pgx.ParseConfig(connString)
	if err != nil {
		t.Fatalf("parse config: %v", err)
	}
	cfg.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	conn, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer conn.Close(ctx)
	if _, err := conn.Exec(ctx, string(sql)); err != nil {
		t.Fatalf("apply baseline: %v", err)
	}
}

func seed(t *testing.T, ctx context.Context, pool *pgxpool.Pool, n int) {
	t.Helper()
	var clientID, contractID int64
	if err := pool.QueryRow(ctx, `
		INSERT INTO clients (document, document_type, name)
		VALUES ('11222333000181','CNPJ','Cliente Worker') RETURNING id`).Scan(&clientID); err != nil {
		t.Fatalf("seed client: %v", err)
	}
	if err := pool.QueryRow(ctx, `
		INSERT INTO contracts (client_id, title, amount, billing_day)
		VALUES ($1,'Contrato Worker',100.00,5) RETURNING id`, clientID).Scan(&contractID); err != nil {
		t.Fatalf("seed contract: %v", err)
	}
	for i := 0; i < n; i++ {
		var invoiceID int64
		if err := pool.QueryRow(ctx, `
			INSERT INTO invoices (contract_id, amount, due_date, status)
			VALUES ($1, 100.00, date '2026-08-05', 'OPEN') RETURNING id`, contractID).Scan(&invoiceID); err != nil {
			t.Fatalf("seed invoice %d: %v", i, err)
		}
		payload := fmt.Sprintf(`{"chargeId": %d, "invoiceId": %d, "e2eId": "E2E-%03d"}`, i+1, invoiceID, i)
		if _, err := pool.Exec(ctx, `
			INSERT INTO outbox_events (aggregate, aggregate_id, type, payload)
			VALUES ('charge', $1, 'charge.settled', $2::jsonb)`, int64(i+1), payload); err != nil {
			t.Fatalf("seed outbox %d: %v", i, err)
		}
	}
}
