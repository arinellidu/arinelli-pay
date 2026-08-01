-- Arinelli Pay — baseline (DbUp). Dinheiro: NUMERIC(14,2). Documentos: só dígitos.
CREATE TABLE clients (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document      VARCHAR(14) NOT NULL,
  document_type VARCHAR(4)  NOT NULL CHECK (document_type IN ('CPF','CNPJ')),
  name          VARCHAR(160) NOT NULL,
  email         VARCHAR(160),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_clients_document UNIQUE (document)
);

CREATE TABLE contracts (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id   BIGINT NOT NULL REFERENCES clients(id),
  title       VARCHAR(160) NOT NULL,
  amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  billing_day SMALLINT NOT NULL CHECK (billing_day BETWEEN 1 AND 28),
  status      VARCHAR(12) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ENDED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_contracts_client ON contracts(client_id);

CREATE TABLE invoices (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contract_id BIGINT NOT NULL REFERENCES contracts(id),
  amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  due_date    DATE NOT NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'OPEN'
              CHECK (status IN ('DRAFT','OPEN','PAID','OVERDUE','CANCELED')),
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_invoices_contract ON invoices(contract_id);
CREATE INDEX ix_invoices_status_due ON invoices(status, due_date);

CREATE TABLE charges (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_id      BIGINT NOT NULL REFERENCES invoices(id),
  rail            VARCHAR(8)  NOT NULL CHECK (rail IN ('PIX','BOLETO','CARD')),
  provider        VARCHAR(16) NOT NULL,
  provider_ref    VARCHAR(80),
  idempotency_key VARCHAR(64) NOT NULL,
  status          VARCHAR(10) NOT NULL DEFAULT 'CREATED'
                  CHECK (status IN ('CREATED','PENDING','SETTLED','FAILED','REFUNDED')),
  failure_code    VARCHAR(32),
  payload         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at      TIMESTAMPTZ,
  CONSTRAINT uq_charges_idem UNIQUE (idempotency_key),
  CONSTRAINT uq_charges_provider_ref UNIQUE (provider, provider_ref)
);
CREATE INDEX ix_charges_invoice ON charges(invoice_id);

-- I2: outbox — gravado na MESMA transação do estado; entregue pelo worker Go
CREATE TABLE outbox_events (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  aggregate    VARCHAR(24) NOT NULL,
  aggregate_id BIGINT NOT NULL,
  type         VARCHAR(40) NOT NULL,
  payload      JSONB NOT NULL,
  attempts     INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX ix_outbox_unprocessed ON outbox_events(processed_at) WHERE processed_at IS NULL;

-- I5: webhook cru persistido antes de qualquer processamento
CREATE TABLE webhook_events (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider     VARCHAR(16) NOT NULL,
  signature_ok BOOLEAN NOT NULL,
  raw_body     JSONB NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  dedupe_key   VARCHAR(120),
  CONSTRAINT uq_webhook_dedupe UNIQUE (provider, dedupe_key)
);
