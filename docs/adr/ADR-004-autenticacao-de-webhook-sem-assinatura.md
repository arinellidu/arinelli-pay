# ADR-004 — Autenticar webhook de PSP que não assina o corpo

**Status:** Aceito · 2026-08-02 (P08 — Efí)

## Contexto
I5 exige webhook **verificado ou descartado**. No P04 isso foi barato: o webhook de dev
é nosso, e HMAC-SHA256 sobre o corpo cru resolve.

A Efí não assina o corpo. O mecanismo dela é **mTLS reverso**: a Efí apresenta um
certificado ao nosso endpoint e cabe a nós validar o certificado *do cliente*. Isso
pressupõe terminação TLS sob nosso controle — não existe em `localhost`, não existe atrás
de túnel de desenvolvimento, e não existe em PaaS que termina TLS antes da aplicação.
A própria Efí reconhece o buraco e oferece o header `x-skip-mtls-checking` no cadastro do
webhook, deixando a autenticação por conta de quem recebe.

As saídas consideradas:

1. **mTLS de verdade na borda** — correto, mas exige infra que o projeto ainda não tem
   (ingress com `ssl_verify_client`), e nenhum teste local passaria a rodar.
2. **Aceitar sem autenticar, confiando no IP de origem** — allowlist de IP de PSP muda sem
   aviso e não é segredo; e um `POST` forjado liquidaria fatura. Viola I5.
3. **Segredo compartilhado na query string da URL cadastrada** — a URL do webhook é
   configurada uma vez, por canal autenticado (mTLS + OAuth), e nunca trafega em claro
   depois: quem não cadastrou não sabe o segredo.

## Decisão
**Cada provider autentica do jeito dele, atrás de um port.** `WebhookTranslator` tem
`authenticate(byte[] rawBody, WebhookRequest)` — o corpo CRU vai separado, e cada
implementação escolhe o mecanismo:

| Provider | Mecanismo |
|---|---|
| `pix` (fake, pix-sandbox) | HMAC-SHA256 do corpo cru no header `X-Signature` |
| `efi` | segredo compartilhado em `?hmac=`, comparado em tempo constante |

Regras que valem para todos:
- **Fail closed:** segredo não configurado reprova tudo. Nunca "sem segredo, então libera".
- **Tempo constante:** `MessageDigest.isEqual`, sem early-return que vaze prefixo por timing.
- **Reprovado ainda é registrado:** `webhook_events` com `signature_ok=false` antes do 401 —
  descartar sem rastro é como não ter recebido.

O que acontece **depois** de autenticar é idêntico para todo provider: registra o cru,
deduplica por `(provider, dedupe_key)`, liquida a charge e grava o outbox na mesma
transação (I2, I7). Nenhum PSP tem pipeline próprio.

## Consequências
- Segredo na query aparece em log de proxy/access log de quem estiver no caminho. Mitigação:
  segredo longo e aleatório por ambiente, rotacionável recadastrando o webhook — e o dano
  máximo de vazamento é um `charge.settled` forjado com `endToEndId` inédito, visível na
  conciliação do P12 como crédito sem extrato.
- Em produção com ingress próprio, a validação do certificado do cliente na borda **substitui**
  esta checagem sem tocar no código: basta o segredo continuar configurado.
- P09 (Asaas) e P10 (Stripe) entram como novos `WebhookTranslator`. Stripe assina de verdade
  (`Stripe-Signature` sobre o corpo cru) — o port já acomoda, e nenhum filtro pode consumir o
  stream antes do controller.
