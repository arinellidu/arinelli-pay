-- Pessoas (PF/PJ) — cadastro promovido do mock do BFF para o core (I6: SQL-first).
-- PJ sempre atrelada a uma PF responsável legal (FK obrigatória).
-- Documentos: só dígitos, como em clients.
CREATE TABLE natural_persons (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name      VARCHAR(160) NOT NULL,
  cpf            VARCHAR(11) NOT NULL,
  email          VARCHAR(160),
  phone          VARCHAR(11),
  zip_code       VARCHAR(8),
  street         VARCHAR(160),
  address_number VARCHAR(20),
  complement     VARCHAR(80),
  district       VARCHAR(80),
  city           VARCHAR(80),
  state          VARCHAR(2),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_natural_persons_cpf UNIQUE (cpf)
);

CREATE TABLE legal_persons (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  corporate_name VARCHAR(160) NOT NULL,
  trade_name     VARCHAR(160),
  cnpj           VARCHAR(14) NOT NULL,
  contact_email  VARCHAR(160) NOT NULL,
  contact_phone  VARCHAR(11) NOT NULL,
  responsible_id BIGINT NOT NULL REFERENCES natural_persons(id),
  zip_code       VARCHAR(8),
  street         VARCHAR(160),
  address_number VARCHAR(20),
  complement     VARCHAR(80),
  district       VARCHAR(80),
  city           VARCHAR(80),
  state          VARCHAR(2),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_legal_persons_cnpj UNIQUE (cnpj)
);
CREATE INDEX ix_legal_persons_responsible ON legal_persons(responsible_id);
