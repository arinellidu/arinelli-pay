# Changelog

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Uma entrada por prompt do playbook (1 prompt = 1 PR).

## [Unreleased]

### P06 — BFF NestJS (2026-08-01)

- Módulos clients/contracts/invoices/charges consumindo só o gateway (`HttpModule` com baseURL `GATEWAY_URL` e timeout 5s); prefixo global `/bff`, `ValidationPipe` (whitelist) + `ClassSerializerInterceptor`, CORS para o front.
- `GET /bff/invoices`: DTO de TELA — página do billing + última charge do payments por item (`{client, contract, charge:{rail,status,emv}}`) em uma chamada. `GET /bff/invoices/:id/status` é passthrough SEM cache (polling do P07).
- `POST /bff/charges` repassa a `Idempotency-Key` do front intacta — nunca gera (I1); 201/200 e erros ProblemDetail do core passam fiéis; upstream fora → 502.
- Cache 60s handler a handler (`CacheInterceptor`+`CacheTTL`) apenas em leituras.
- ADR-002 (SQL-first/Flyway) e ADR-003 (BFF fino) escritos — seeds 2 e 3 do DESIGN.md.
- Testes e2e (8) com gateway mockado em HTTP real: agregação, cache em leitura, polling sem cache, key repassada byte a byte, 400 propagado, validação local sem tocar upstream, escape do `:` na rota generate-next, 502 com upstream morto.

### P05 — Gateway (2026-08-01)

- Spring Cloud Gateway 5 (prefixo novo `spring.cloud.gateway.server.webflux.*`): rotas `/api/billing/**` → billing-core e `/api/payments/**` → payments-core (URLs por env `BILLING_CORE_URL`/`PAYMENTS_CORE_URL`), `StripPrefix=2`.
- I1 na borda: `GlobalFilter` devolve 400 ProblemDetail para mutação em `/api/payments/charges` sem `Idempotency-Key` — sem tocar o backend.
- `RequestRateLimiter` (Redis reativo, default-filter nas duas rotas): 10 rps, burst 20, chave `X-Client-Id` com fallback IP (`clientKeyResolver`).
- `X-Request-Id`: gateway gera se ausente (HIGHEST_PRECEDENCE), propaga ao downstream e ecoa na resposta; billing e payments têm `RequestIdFilter` (MDC) + pattern `[rid:%X{requestId}]` — id aparece nos logs dos serviços.
- Testes (5, Testcontainers Redis + backend fake): StripPrefix, rid gerado/propagado intacto, 400 na borda sem key, passagem com key, 429 após o burst.
- Live via gateway: fatura gerada → charge (400 sem key na borda) → webhook → **PAID em 1.2s**; rate limit real a 37.6 rps → 28×429/32×200; rid do gateway visível no log do payments.

### P04 — Webhook Pix + outbox dispatcher Go (2026-08-01)

- `POST /webhooks/pix` (payments-core): corpo lido CRU (`byte[]`), HMAC-SHA256 (`WEBHOOK_HMAC_SECRET`, header `X-Signature`) comparado em tempo constante. Inválida → 401 + registro `signature_ok=false` (corpo não-JSON entra embrulhado em `{"_unparsed"}`). Válida → raw persistido com `dedupe_key=e2eId` ANTES de processar (I5); replay → 200 `duplicate` sem reprocessar (`uq_webhook_dedupe`).
- MESMA transação (TransactionTemplate — sem proxy self-invocation): charge PENDING→SETTLED + INSERT `outbox_events('charge.settled')` com `{chargeId, invoiceId, e2eId, settledAt}`. Zero chamada externa dentro da transação (I2). Charge desconhecida/status não conclusivo → 200 sem efeito.
- `GET /invoices/{id}/status` → `{status, paidAt, charge:{rail,status}}` para o polling da UI.
- Worker Go: dispatcher tick 1s com drain, `FOR UPDATE SKIP LOCKED LIMIT 50`, transação por lote; `charge.settled` → invoice PAID + `paid_at` idempotente (I7); falha por evento → `attempts+1` com backoff exponencial (2^attempts s, cap 300) sem derrubar o lote; slog + graceful shutdown.
- `FakePixProvider` agora devolve `providerRef = txid` (correlação do webhook por `provider_ref`); payload da charge ganhou `txid`.
- Testes: 8 de webhook (assinatura inválida ×2, liquidação+outbox atômicos, replay, desconhecida/ignorada, sem e2eId, status consolidado, corpo embrulhado) e Go com Testcontainers — 3 workers concorrentes, 100 eventos, nenhum processado duas vezes + evento venenoso só incrementa attempts. Live: webhook → PAID em 0.6s.

### P03 — Charges e Pix (2026-08-01)

- payments-core: port `PixProvider` no domínio (I4) com `FakePixProvider` (BR Code EMV gerado com CRC16/CCITT-FALSE real — payload passa em validador) e `PixSandboxAdapter` (`RestClient`, timeout 3s via `spring.http.clients.*`, retry ×3 só em transitório I/O/5xx; 4xx falha direto). Seleção por `PIX_PROVIDER` (`@ConditionalOnProperty`, default `fake`).
- `POST /charges {invoiceId, rail:PIX}` exige `Idempotency-Key` (400 ProblemDetail sem — I1). Fluxo: insert CREATED em transação própria → provider fora de transação → update PENDING com `provider_ref` e payload JSONB `{emv, providerRef}`. Replay → 200 com a charge original; corrida resolvida capturando violação de `uq_charges_idem`. Fatura inexistente → 404; PAID/CANCELED → 409; BOLETO/CARD → 400 (entram no P09/P10).
- `GET /charges/{id}` e `GET /invoices/{id}/charges`.
- payments-core lê `invoices` só via `JdbcClient` (`InvoiceReader`) — entidade continua do billing-core; Flyway é test-scope (schema em runtime é responsabilidade do billing).
- Testes (15): EMV/CRC com vetor de referência, semântica de retry do adapter com `MockRestServiceServer`, e integração Testcontainers com aceite de corrida — 2 threads, mesma key, UM charge no banco.

### P02 — Contratos e faturas (2026-08-01)

- `/contracts`: POST (404 se cliente não existe, `billingDay` 1–28, valor com escala 2 e `RoundingMode` explícito — I3), GET com filtro `?clientId=`, GET `{id}`. `ContractResponse` com tudo que card E tabela usam: cliente embutido (nome/documento/tipo), `nextDueDate` calculado, status, criação.
- `POST /contracts/{id}/invoices:generate-next`: gera a próxima fatura OPEN sem scheduler — `DueDateRule` pura (próximo `billing_day`; se passou, mês seguinte; se já existe fatura nesse dia ou depois, um mês após a última não cancelada). Contrato ENDED → 409.
- `GET /invoices` com filtros `status/clientId/from/to` + `Pageable` (Specification + `@EntityGraph` para evitar N+1; página serializada VIA_DTO: `{content, page:{...}}`).
- `@Scheduled` diário (`billing.overdue-cron`, default 00:05): OPEN vencida → OVERDUE via update em lote.
- Testes: 17 casos de borda da `DueDateRule` (dia 28, fevereiro, virada de mês e de ano, sequência longa) + 10 cenários de integração (Testcontainers) — 65 testes verdes no módulo.

### P01 — Clientes (2026-08-01)

- billing-core: `DocumentValidator` puro (CPF/CNPJ, dígitos verificadores sem lib) com testes de tabela — 6 válidos e 6 inválidos de cada, cobrindo sequências repetidas, DV errado e tamanho errado (30 casos).
- Entidade `Client` mapeando o schema do baseline (I6, `ddl-auto=validate`) + `ClientRepository`.
- REST `/clients`: POST (normaliza máscara, infere CPF/CNPJ, 400 `ProblemDetail` se inválido, 409 se duplicado — corrida coberta pelo `uq_clients_document`), GET lista, GET `{id}` (404 ProblemDetail), PUT `{id}`.
- Teste de integração com Testcontainers 2.0.5 (`postgres:17-alpine` real + Flyway aplicando `infra/migrations`) — 8 cenários via `TestRestTemplate`.
- Boot 4: `TestRestTemplate` agora vem de `spring-boot-resttestclient` (+`spring-boot-restclient` para o `RestTemplateBuilder`); Testcontainers 2.x não é mais gerenciado pelo BOM do Boot — importado `testcontainers-bom` 2.0.5 na raiz (artefato novo `testcontainers-postgresql`, classe `org.testcontainers.postgresql.PostgreSQLContainer`).

### P00 — Bootstrap (2026-08-01)

- Infra local: docker compose com Postgres 17 (host **5433**) e Redis 8 (host **6380**), ambos com healthcheck. Portas fora do padrão porque o stack legado `arinelli-pay-official` ainda ocupa 5432/6379 — ao aposentá-lo, basta reverter `docker-compose.yml` e `.env.example`.
- Multi-módulo Maven (Java 25 · Spring Boot 4.1.0 · Framework 7): `services/billing-core`, `services/payments-core`, `services/gateway` (Spring Cloud 2025.1.2, starter `gateway-server-webflux`) + Maven Wrapper 3.9.16. Starters novos do Boot 4 (`spring-boot-starter-webmvc`, `spring-boot-starter-flyway`).
- billing-core: Flyway lendo `filesystem:../../infra/migrations` com convenção `NNNN_nome.sql` (prefixo vazio, separador `_`), `ddl-auto=validate`; baseline `0001_baseline.sql` aplicado — 6 tabelas + `flyway_schema_history`.
- `services/workers`: módulo Go 1.26 (`pgx` v5) com `GET /health` em `:8083` fazendo ping no Postgres, slog JSON e graceful shutdown.
- `apps/bff`: NestJS 11 (pnpm), porta 3001. `apps/web`: Next.js 16.2.11 + React 19.2 + Tailwind 4 + shadcn/ui (base-nova); builds de produção verdes nos dois.
- `CHANGELOG.md`, `.editorconfig`; `.env.example` com URLs nas novas portas.

Portas dev: gateway **8090** · billing-core **8081** · payments-core **8082** · workers **8083** · bff **3001** · web **3000** (8080 reservada ao pix-sandbox).
