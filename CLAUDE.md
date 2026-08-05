# CLAUDE.md — Arinelli Pay (session anchor)

Leia este arquivo e `docs/DESIGN.md` antes de qualquer alteração. Siga `docs/playbook/PROMPTS.md` na ordem: 1 prompt = 1 PR.

## O que é
SaaS de cobrança multi-trilho (Pix · boleto/QR · cartão) com CRM mínimo: CPF/CNPJ → Cliente → Contrato → Faturas, integrado a sandboxes oficiais de PSP/banco e a Open Finance (Pluggy) para conciliação.

## Stack (fechada — não introduza runtimes novos)
| Camada | Tech | Papel |
|---|---|---|
| Core de negócio e pagamentos | **Java 25 LTS + Spring Boot 4.1** (Spring Framework 7) | billing-core, payments-core: domínio, transações, máquina de estados |
| API Gateway | **Spring Cloud Gateway** (linha compatível com Boot 4.1) | rotas, filtro de Idempotency-Key, rate limit Redis |
| BFF | **TypeScript + NestJS 11** | agrega para a UI, sessão, DTOs de tela |
| Front | **Next.js 16.2.11 LTS + React 19.2** | App Router, Turbopack, shadcn/ui, TanStack Table |
| Workers concorrentes | **Go 1.26.5** | outbox dispatcher, sync Open Finance, matcher de conciliação |
| Dev local de Pix | **pix-sandbox** (Go, repo próprio) | emulador do ciclo Pix |
| Dados | **PostgreSQL 17** (SQL-first, Flyway) + **Redis 8** | |
| IA (fase 2) | **Python/FastAPI + LangGraph/LangSmith/Langfuse** | serviço satélite, fora do caminho de decisão |

**Por que Go só nos workers:** é onde concorrência e I/O-bound pagam (SKIP LOCKED + goroutines + backoff). Gateway não justifica um runtime extra — Spring Cloud Gateway já está no ecossistema do core.

## Invariantes (nunca viole)
- **I1 — Idempotência total.** Mutação que cria dinheiro a receber — cobrança e geração de fatura — exige `Idempotency-Key`; replay retorna o resultado original. Unique no banco (ADR-005).
- **I2 — Outbox.** Efeito externo só via outbox: evento gravado na MESMA transação do estado; entrega é assíncrona (worker Go).
- **I3 — Dinheiro é `BigDecimal` / `NUMERIC(14,2)`.** Nunca double. Scale 2, RoundingMode explícito.
- **I4 — Providers atrás de ports.** Nenhum SDK de PSP fora de `adapters/`.
- **I5 — Webhook verificado ou descartado.** Assinatura validada sobre o corpo cru; payload persistido antes de processar.
- **I6 — SQL-first.** Schema só por Flyway versionado; JPA com `ddl-auto=validate`, nunca gerando DDL.
- **I7 — Fatura só vira PAID por evento de liquidação processado.** Nunca por request do front.
- **I8 — LLM drafts, deterministic code executes.** IA (fase 2) nunca no caminho de decisão.

## Estrutura
`services/billing-core` (Java) · `services/payments-core` (Java) · `services/gateway` (Java/SCG) · `services/workers` (Go) · `apps/bff` (NestJS) · `apps/web` (Next.js) · `infra/migrations` (SQL) · `docs/adr`.
