# Changelog

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Uma entrada por prompt do playbook (1 prompt = 1 PR).

## [Unreleased]

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
