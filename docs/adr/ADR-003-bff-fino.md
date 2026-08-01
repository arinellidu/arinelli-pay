# ADR-003 — BFF fino: agregação sim, regra de negócio nunca

**Status:** Aceito · 2026-08-01 (formaliza o seed nº 3 do DESIGN.md, implementado no P06)

## Contexto
A UI precisa de payloads prontos para tela (fatura com cliente, contrato e charge juntos). A tentação clássica é o BFF virar um segundo backend.

## Decisão
O BFF (NestJS) faz exatamente três coisas:
1. **Agregação:** compõe respostas do gateway (ex.: `/bff/invoices` = página do billing + última charge do payments por item).
2. **Adaptação:** DTOs no shape da tela; erros do core (ProblemDetail) passam fiéis; upstream fora do ar vira 502.
3. **Cache curto:** 60s apenas em leituras — nunca no polling de status (que sustenta o badge PAID em <5s).

Proibido no BFF: cálculo de vencimento, decisão/transição de status, validação de dígitos de documento, geração de Idempotency-Key (a key nasce no front e passa intacta — I1).

## Consequências
- Se uma feature pedir regra no BFF, a regra vai para o core Java e o BFF só agrega.
- BFF é substituível/descartável; o core continua sendo a única fonte de verdade.
