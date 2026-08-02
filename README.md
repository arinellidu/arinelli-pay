# Arinelli Pay

Multi-rail billing SaaS — **Pix · boleto/QR · card** — with a minimal CRM flow (CPF/CNPJ → client → contract → invoices), real PSP sandbox integrations, and Open Finance reconciliation.

![Automated demo](docs/demo.gif)

*One real loop, no mocks: invoice → Pix QR (valid EMV) → simulated payment → HMAC-verified webhook → outbox → Go worker → invoice settles live via 3s polling. The background field is driven by those same events — it only moves because the backend answered.*

Recorded by `apps/web/scripts/demo-gif.mjs` against the full local stack (it provisions its own client, contract and invoice, so it is rerunnable from scratch); `apps/web/e2e/demo.spec.ts` asserts the same loop as a test.

**Runtime boundaries by responsibility:** Java 25 LTS / Spring Boot 4.1 (Framework 7) for the transactional core and gateway, Go 1.26 for concurrent workers (outbox, reconciliation), NestJS 11 as a thin BFF, Next.js 16 (React 19.2) for the UI, PostgreSQL 17 throughout.

Spec-driven: read `CLAUDE.md`, then execute `docs/playbook/PROMPTS.md` (P00–P12) — one prompt = one PR, human review on every merge.

```bash
docker compose up -d      # postgres (host 5433) + redis (host 6380)
./mvnw package            # billing-core · payments-core · gateway (Java 25 / Boot 4.1)
go -C services/workers build ./...
pnpm -C apps/bff build && pnpm -C apps/web build
```

**Dev ports:** gateway `8090` · billing-core `8081` · payments-core `8082` · workers health `8083` · bff `3001` · web `3000` (`8080` reserved for pix-sandbox). Postgres/Redis publish on `5433`/`6380` while the legacy `arinelli-pay-official` compose stack holds the default ports.
