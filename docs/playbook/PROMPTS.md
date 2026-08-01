# Playbook — Arinelli Pay (Java/Spring · Go · NestJS · Next.js)

## Regras de sessão
- 1 prompt = 1 PR. Leia `CLAUDE.md` e `docs/DESIGN.md` antes de codar.
- Não avance sem eu mandar. Não amplie escopo. Não introduza runtimes fora do CLAUDE.md.
- Todo P fecha com: build + testes verdes, arquivos alterados listados, linha no CHANGELOG, commit convencional.
- Dinheiro: `BigDecimal` / `NUMERIC(14,2)`. Segredos só via env.
- Ambiguidade: PARE e pergunte.
- No início de cada P, confirme versões (`java -version`, `go version`, `node -v`) contra o anexo; avise divergência, não baixe de versão silenciosamente.

---

## P00 — Bootstrap
```
Leia CLAUDE.md e docs/DESIGN.md. Estamos no P00.

Tarefas:
1. `docker compose up -d` (postgres 17 + redis 8); confirme healthchecks.
2. Multi-módulo Maven na raiz (pom agregador) com os módulos services/billing-core, services/payments-core, services/gateway. **Spring Boot 4.1.x (Framework 7), Java 25, `maven.compiler.release=25`**, e `global.json`-equivalente: valide `java -version` = 25 antes de gerar. Se algum starter/lib não resolver no Boot 4.1, PARE e reporte — não regrida para 3.x (EOL).
3. billing-core: Flyway apontando para `filesystem:../../infra/migrations`, `spring.jpa.hibernate.ddl-auto=validate`. Rode: o baseline 0001 deve criar todas as tabelas.
4. services/workers: `go mod init` (go 1.26), main com /health e conexão pgx ao Postgres.
5. apps/bff: `nest new` (NestJS 11, pnpm). apps/web: `create-next-app` (Next 16.2.11+, TS, App Router, Turbopack, Tailwind) + shadcn/ui init.
6. CHANGELOG.md e .editorconfig.
Aceite: compose saudável, Flyway aplicou o baseline, os 3 serviços Java sobem, worker Go responde /health, bff e web buildam.
```

## P01 — Clientes (billing-core)
```
Estamos no P01. Invariantes: I3, I6.

1. Entidades JPA mapeando o schema existente (validate). Nunca gerar DDL.
2. `DocumentValidator` puro para CPF e CNPJ (dígitos verificadores, sem lib) + testes de tabela: 6 válidos e 6 inválidos de cada, incluindo sequências repetidas e tamanho errado.
3. REST /clients: POST/GET/GET{id}/PUT. POST normaliza (strip máscara), infere tipo, 400 ProblemDetail se inválido, 409 se duplicado.
4. Teste de integração com Testcontainers (Postgres real + Flyway).
Aceite: `mvn verify` verde; CPF e CNPJ criados via curl; duplicado → 409.
```

## P02 — Contratos e faturas (billing-core)
```
Estamos no P02. Base: P01.

1. /contracts: POST, GET por cliente, GET{id}. DTO com todos os campos que a UI usa em card E tabela.
2. POST /contracts/{id}/invoices:generate-next — próxima OPEN (due_date no próximo billing_day; se já passou, mês seguinte). Geração explícita, sem scheduler.
3. GET /invoices com filtros status/clientId/from/to + paginação (Pageable).
4. `@Scheduled` diário: OPEN vencida → OVERDUE.
Aceite: fluxo curl completo; testes de borda da regra de vencimento (dia 28, virada de mês e de ano).
```

## P03 — Charges e Pix (payments-core, ports/adapters)
```
Estamos no P03. Invariantes: I1, I3, I4. Base: P02.

1. Interface `PixProvider` no pacote de domínio; implementações `FakePixProvider` (in-memory, EMV fixo válido) e `PixSandboxAdapter` (RestClient para PIX_SANDBOX_URL, timeout 3s, retry só em erro transitório). Seleção por `PIX_PROVIDER` (@ConditionalOnProperty). Nenhum tipo do provider fora de `adapters` (I4).
2. POST /charges {invoiceId, rail:"PIX"} exigindo header `Idempotency-Key` (400 sem). Persiste charge CREATED→PENDING, provider_ref, payload JSONB com EMV. Replay da mesma key → charge original (200); trate corrida capturando violação de uq_charges_idem.
3. GET /charges/{id}, GET /invoices/{id}/charges.
Aceite: teste de integração com 2 threads e a mesma Idempotency-Key → UM charge no banco.
```

## P04 — Webhook (Java) + outbox dispatcher (Go)
```
Estamos no P04. Invariantes: I2, I5, I7. Base: P03.

Java (payments-core):
1. POST /webhooks/pix lendo o corpo CRU; valida HMAC-SHA256 (WEBHOOK_HMAC_SECRET). Inválido → 401 + registro com signature_ok=false. Válido → persiste raw (dedupe_key=e2eId) ANTES de processar; duplicado → 200 sem reprocessar.
2. MESMA transação: charge PENDING→SETTLED + INSERT em outbox_events('charge.settled'). Zero chamada externa dentro da transação.
3. GET /invoices/{id}/status → {status, paidAt, charge:{rail,status}}.

Go (services/workers):
4. Dispatcher: tick 1s, `SELECT ... WHERE processed_at IS NULL ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 50` (pgx, transação por lote); `charge.settled` → invoice PAID + paid_at (I7) + marca processed_at. Backoff exponencial por `attempts`, log estruturado (slog), graceful shutdown.
5. Teste com Testcontainers: 3 workers concorrentes, 100 eventos, nenhum processado duas vezes.
Aceite: fatura → charge → pagamento simulado → webhook → PAID em <5s no polling. Testes de assinatura inválida e replay.
```

## P05 — Gateway (Spring Cloud Gateway)
```
Estamos no P05. Invariante: I1 no edge. Base: P04.

1. Rotas /api/billing/** → billing-core, /api/payments/** → payments-core (URLs por env), StripPrefix correto.
2. GlobalFilter: mutação em /api/payments/charges sem `Idempotency-Key` → 400 no edge.
3. RequestRateLimiter com Redis, key = X-Client-Id (fallback IP), 10 rps / burst 20.
4. X-Request-Id propagado (gerado se ausente) e logado nos serviços.
Aceite: todo o fluxo do P04 via gateway; testes do filtro e do rate limit.
```

## P06 — BFF (NestJS)
```
Estamos no P06. Base: P05.

1. Módulos clients/contracts/invoices consumindo o gateway (HttpModule, timeout, ClassSerializer). DTOs pensados para a TELA (ex.: /bff/invoices já traz cliente, contrato e charge agregados).
2. `POST /bff/charges` repassa a Idempotency-Key recebida do front — nunca gera uma nova.
3. Zero regra de negócio (ADR-003): sem cálculo de vencimento, sem decisão de status. Só agregação, adaptação e cache curto (60s) em leituras.
4. Testes e2e do Nest com o gateway mockado.
Aceite: /bff/invoices devolve em uma chamada tudo que a tela precisa; testes verdes.
```

## P07 — Front (Next.js 16)
```
Estamos no P07. Base: P06.

1. Páginas /clients, /clients/[id], /invoices consumindo o BFF (Server Components na leitura).
2. Contratos e Faturas com **toggle card ⇄ tabela** (?view=cards|table). Card: título, cliente, valor, vencimento, badges de status/trilho. Tabela: TanStack com ordenação e paginação.
3. Filtros de faturas: status, trilho, cliente, período — na querystring.
4. "Cobrar via Pix" → POST /bff/charges com Idempotency-Key (uuid do client) → modal com QR do EMV + copia-e-cola.
5. Polling 3s enquanto houver charge PENDING; badge vira PAID sem reload.
Aceite: demo completa no navegador; gravar o fluxo (GIF do README).
```

## P08 — Pix real (Efí sandbox)
```
Estamos no P08. Invariante: I4. Base: P07.
1. `EfiAdapter implements PixProvider` — OAuth com mTLS (EFI_CERT_PATH), criar/consultar cobrança. Ativado por PIX_PROVIDER=efi.
2. /webhooks/efi convergindo para o MESMO pipeline do P04.
3. docs/providers/EFI.md.
Aceite: com creds de sandbox, o fluxo do P07 roda contra a Efí trocando 1 variável. Sem creds, testes com WireMock verdes.
```

## P09 — Boleto com QR (Asaas)
```
Estamos no P09. Base: P08.
1. `BoletoProvider` + `AsaasAdapter` (sandbox) → {linhaDigitavel, pdfUrl, pixQrCode, providerRef}.
2. POST /charges rail=BOLETO com o mesmo contrato de idempotência; webhook /webhooks/asaas → mesmo pipeline.
3. Front: linha digitável (copiar), PDF, QR; filtro por trilho com dados reais.
Aceite: pagamento simulado no sandbox → PAID no front. docs/providers/ASAAS.md.
```

## P10 — Cartão (Stripe test mode)
```
Estamos no P10. Base: P09.
1. `CardProvider` + `StripeAdapter`: PaymentIntent (centavos, BRL), client_secret no payload.
2. Front: Payment Element com o client_secret.
3. /webhooks/stripe verificando assinatura sobre o corpo CRU (nenhum filtro pode consumir o stream antes) → payment_intent.succeeded → pipeline → PAID.
Aceite: 4242… no navegador → PAID via webhook (stripe cli listen). docs/providers/STRIPE.md.
```

## P11 — Open Finance (Pluggy) — ingestão em Go
```
Estamos no P11. Base: P10.
1. Migration 0002: bank_connections e bank_transactions (external_id UNIQUE, amount NUMERIC(14,2), tx_date, e2e_id NULL, raw JSONB).
2. Worker Go: cliente Pluggy (auth, connect token, sync paginado), idempotente por external_id, a cada 15 min + trigger manual.
3. Endpoint no payments-core para emitir o connect token; página /bank no Next com Pluggy Connect (sandbox) e extrato.
Aceite: conta sandbox conectada, transações importadas, re-sync não duplica. docs/providers/PLUGGY.md.
```

## P12 — Conciliação (Go) + deploy GitOps
```
Estamos no P12. Base: P11.

Conciliação:
1. Migration 0003: reconciliations (charge_id UNIQUE, transaction_id UNIQUE, matched_by CHECK IN ('E2E','AMOUNT_DATE','MANUAL'), matched_at).
2. Matcher no worker Go: e2e_id exato; senão valor exato em janela D+0/D+1. Ambiguidade NÃO casa automaticamente — vai para revisão manual.
3. GET /reconciliation/report?from&to (Java) com três buckets e totais: conciliados, charges sem extrato, créditos órfãos. Front /reconciliation com match manual.
4. Teste-narrativa: 5 pagamentos, 1 sem extrato, 1 crédito órfão — o relatório conta exatamente essa história.

Deploy:
5. Dockerfiles multi-stage (JRE 21 slim com layertools; Go distroless; Next standalone). k8s/ com kustomize base+overlays e argocd/application.yaml.
6. Perf pass: `hey` no POST /charges; **JFR** no payments-core e **pprof** no worker. docs/PERF.md com 3 achados e 1 correção, números antes/depois.
Aceite: k3d/kind com ArgoCD sincronizando; PERF.md com dados reais. Fim do v1.
```

## Fase 2 (backlog)
- `services/ai-analyst` (Python/FastAPI + LangGraph + Langfuse): copiloto de cobrança e explicação de divergências. Nunca no caminho de decisão (I8).
- Multi-tenant + OIDC, WebSocket no lugar do polling, ledger de dupla entrada com property tests.

---

## Anexo — Versões-alvo (verificadas em 01/ago/2026)

| Componente | Versão | Nota |
|---|---|---|
| Java | **25 (LTS)** | LTS corrente; 21 permanece como piso de mercado em vagas, mas o projeto usa 25. |
| Spring Boot | **4.1.x** | Único caminho para projeto novo: linha 3.x inteira EOL desde 30/jun/2026 (3.5.16 foi o patch final). Framework 7. Atenção: a maioria dos tutoriais na internet ainda é 3.x — em divergência, a doc oficial 4.1 manda. |
| Go | **1.26.5** (jul/2026) | 1.27 em RC. |
| Next.js | **16.2.11+** (Active LTS) | Versões 16.x anteriores têm CVEs HIGH. React 19.2, Turbopack padrão. |
| NestJS | **11.1.x** | v12 (ESM, Vitest, Standard Schema) em preview para Q3/2026 — migração vira PR próprio quando estabilizar. |
| PostgreSQL / Redis | **17 / 8** | |
