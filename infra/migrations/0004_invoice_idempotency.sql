-- I1 estendido à geração de fatura: duas travas, uma por natureza de erro.
--
-- 1) uq_invoices_idem — replay do MESMO pedido (clique duplo, retry de rede,
--    reenvio do form) devolve a fatura original em vez de criar outra.
-- 2) uq_invoices_contract_due — dois pedidos DIFERENTES não podem faturar a
--    mesma competência do mesmo contrato. Índice parcial: fatura cancelada sai
--    do caminho e a competência pode ser refeita.
--
-- Linhas anteriores a esta migration ganham chave sintética derivada do id:
-- elas nasceram sem intenção registrada e não podem colidir entre si.
-- Se a base já tiver duas faturas vivas na mesma competência, a criação do
-- índice falha — é o resultado certo: cobrança duplicada não se normaliza em
-- silêncio, ela aparece e alguém decide qual das duas cancelar.

ALTER TABLE invoices ADD COLUMN idempotency_key VARCHAR(64);

UPDATE invoices SET idempotency_key = 'legacy-' || id WHERE idempotency_key IS NULL;

ALTER TABLE invoices ALTER COLUMN idempotency_key SET NOT NULL;

ALTER TABLE invoices ADD CONSTRAINT uq_invoices_idem UNIQUE (idempotency_key);

CREATE UNIQUE INDEX uq_invoices_contract_due
  ON invoices (contract_id, due_date)
  WHERE status <> 'CANCELED';
