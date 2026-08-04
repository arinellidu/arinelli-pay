-- Seed de demonstração do cadastro de pessoas (dados sintéticos; documentos
-- válidos por dígito verificador). Idempotente: ON CONFLICT no unique de
-- documento, ids fixos para a FK do responsável legal, setval no final.
INSERT INTO natural_persons
  (id, full_name, cpf, email, phone, zip_code, street, address_number, complement, district, city, state, created_at)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Helena Prado Martins',    '52998224725', 'helena.prado@exemplo.com.br',    '11987650142', '01310100', 'Avenida Paulista',  '1578', NULL,        'Bela Vista', 'São Paulo',      'SP', '2026-07-21T13:40:00Z'),
  (2, 'Rafael Nogueira Lima',    '11144477735', 'rafael.nogueira@exemplo.com.br', '21996428307', '20040020', 'Rua da Assembleia', '10',   'Sala 2214', 'Centro',     'Rio de Janeiro', 'RJ', '2026-07-24T10:05:00Z'),
  (3, 'Beatriz Sarmento Duarte', '93541134780', NULL,                             '31984120977', NULL,       NULL,                NULL,   NULL,        NULL,         'Belo Horizonte', 'MG', '2026-07-29T18:22:00Z'),
  (4, 'Caio Ferraz Albuquerque', '15350946056', 'caio.ferraz@exemplo.com.br',     NULL,          NULL,       NULL,                NULL,   NULL,        NULL,         NULL,             NULL, '2026-08-01T09:15:00Z')
ON CONFLICT (cpf) DO NOTHING;
SELECT setval(pg_get_serial_sequence('natural_persons', 'id'),
              (SELECT COALESCE(MAX(id), 1) FROM natural_persons));

INSERT INTO legal_persons
  (id, corporate_name, trade_name, cnpj, contact_email, contact_phone, responsible_id, zip_code, street, address_number, complement, district, city, state, created_at)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Estúdio Aurora Design LTDA',   'Aurora Studio', '11222333000181', 'contato@auroradesign.com.br',      '1130074521', 1, '01310100', 'Avenida Paulista', '1578', 'Conj. 904', 'Bela Vista', 'São Paulo',      'SP', '2026-07-22T11:00:00Z'),
  (2, 'Nogueira & Filhos Serviços ME', NULL,           '11444777000161', 'financeiro@nogueirafilhos.com.br', '2125077700', 2, NULL,       NULL,               NULL,   NULL,        NULL,         'Rio de Janeiro', 'RJ', '2026-07-26T16:30:00Z')
ON CONFLICT (cnpj) DO NOTHING;
SELECT setval(pg_get_serial_sequence('legal_persons', 'id'),
              (SELECT COALESCE(MAX(id), 1) FROM legal_persons));
