# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primário (confirmado): avaliador técnico/recrutador navegando a demo por ~3 minutos para julgar senioridade de engenharia. Persona de empréstimo dentro da demo: prestador de serviços brasileiro cobrando clientes recorrentes (contratos → faturas → Pix).

## Product Purpose

SaaS de cobrança multi-trilho (Pix hoje; boleto e cartão nos P09/P10) com CRM mínimo: CPF/CNPJ → cliente → contrato → fatura → cobrança → liquidação por webhook. Sucesso do front (confirmado): impressionar em 3 minutos — o ciclo cobrar → QR Pix → PAID acontece ao vivo, sem reload, e o craft visual é parte da tese de senioridade.

## Positioning

Não é mock: cada badge PAID na tela é consequência de webhook HMAC verificado + outbox + worker Go concorrente (I2/I5/I7). A UI é a janela de um ciclo de pagamento real rodando embaixo — vizinhos de portfólio mostram telas; este mostra um sistema.

## Operating Context

Demo local: Next.js 16 (:3000) → BFF NestJS (:3001) → gateway (:8090) → cores Java + worker Go + Postgres/Redis. Polling curto de 3s no lugar de WebSocket (decisão v1, DESIGN.md). Dados de demonstração autorados (clientes/contratos brasileiros verossímeis), rotulados como sintéticos onde confundível.

## Capabilities and Constraints

- Páginas do P07: `/clients`, `/clients/[id]`, `/invoices`. Toggle card ⇄ tabela via `?view=`; filtros de faturas (status, trilho, cliente, período) na querystring; tabela TanStack com ordenação/paginação.
- "Cobrar via Pix": POST /bff/charges com Idempotency-Key gerada no client (uuid) — modal com QR do EMV + copia-e-cola.
- Server Components na leitura; polling 3s só enquanto houver charge PENDING.
- Trilhos BOLETO/CARD aparecem como vocabulário (badges/filtros) mas só PIX executa hoje.
- Terminologia fixa do domínio: fatura, cobrança, trilho, vencimento, liquidação; estados OPEN/PAID/OVERDUE/CANCELED e CREATED/PENDING/SETTLED/FAILED.
- Moeda R$ (BRL, escala 2); datas dd/mm/aaaa; interface em PT-BR (inferido do domínio Pix/BR — não foi exigência explícita).

## Brand Commitments

Nome fixo: **Arinelli Pay**. Nenhum outro compromisso — paleta, tipografia e tom são livres (confirmado).

## Evidence on Hand

- Backend real completo (P00–P06): EMVs válidos com CRC16, webhook assinado, liquidação em <5s observada (0.6–1.2s).
- Sem logo, sem screenshots, sem depoimentos, sem clientes reais — nada disso pode ser inventado como fato comercial.

## Product Principles

1. A prova é o sistema vivo: cada momento visual importante corresponde a um evento real do backend (nunca simular estado no front — I7).
2. Densidade com hierarquia: o avaliador deve ler o fluxo inteiro em uma tela sem tutorial.
3. Vocabulário do dinheiro brasileiro: Pix, EMV, linha digitável e vencimento são material de design, não jargão a esconder.
4. Três minutos: cada tela precisa render o "uau" antes do primeiro scroll.
