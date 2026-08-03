# Efí — Pix real (homologação)

Adapter do trilho Pix contra a API oficial da Efí (ex-Gerencianet). Ligado por
**uma variável**: `PIX_PROVIDER=efi`. Todo o resto (charges, webhook, outbox, front)
é o mesmo do P03–P07 — o EMV que a Efí devolve entra no mesmo modal do P07 e o
webhook cai no mesmo pipeline do P04.

| | |
|---|---|
| Port | `PixProvider` (`payments/pix`) |
| Adapter | `payments/adapters/efi` — `EfiAdapter`, `EfiTokenProvider`, `EfiMtls`, `EfiWebhookTranslator` |
| Base URL | homologação `https://pix-h.api.efipay.com.br` · produção `https://pix.api.efipay.com.br` |
| Autenticação | OAuth2 `client_credentials` **sobre mTLS** |
| Cobrança | `PUT /v2/cob/{txid}` (txid nosso) |
| Consulta | `GET /v2/cob/{txid}` |
| EMV | `pixCopiaECola` no corpo; fallback `GET /v2/loc/{id}/qrcode` |
| Webhook | `POST /webhooks/efi` e `/webhooks/efi/pix` |

## 1. Credenciais no painel

1. Conta Efí → **API** → aplicação de **homologação**: anote `Client Id` e `Client Secret`.
2. Baixe o **certificado** `.p12` da aplicação. É ele que autentica a conexão — a Efí
   exige mTLS em *toda* chamada, inclusive no `/oauth/token`.
3. Cadastre uma **chave Pix** na conta (homologação aceita chave aleatória). É o campo
   `chave` de toda cobrança.

## 2. Variáveis

```dotenv
PIX_PROVIDER=efi
EFI_BASE_URL=https://pix-h.api.efipay.com.br
EFI_CLIENT_ID=Client_Id_...
EFI_CLIENT_SECRET=Client_Secret_...
EFI_CERT_PATH=C:/certs/efi-homolog.p12    # caminho absoluto
EFI_CERT_PASSWORD=                        # vazia nos certificados padrão
EFI_PIX_KEY=sua-chave-pix
EFI_COB_EXPIRACAO=3600
EFI_WEBHOOK_SECRET=um-segredo-longo-e-aleatorio
```

Faltou variável, o serviço **não sobe**: `EfiProperties.validate()` lista o que falta no
startup. Descobrir credencial faltando na primeira cobrança do cliente é tarde demais.
Isso inclui `EFI_WEBHOOK_SECRET`: sem ele as cobranças funcionariam, mas toda notificação
tomaria 401 (fail-closed) e nenhuma charge liquidaria — falha silenciosa, a pior espécie.

### `.p12` que não carrega

JDKs recentes recusam PKCS#12 exportado com algoritmos legados (RC2/3DES-SHA1). Se o
boot falhar com "falha ao carregar o certificado mTLS", reexporte:

```bash
openssl pkcs12 -in efi-homolog.p12 -legacy -nodes -out efi.pem
openssl pkcs12 -export -in efi.pem -out efi-homolog-moderno.p12   # senha vazia
```

## 3. Webhook

A Efí **não assina o corpo**. O mecanismo oficial é mTLS reverso: ela apresenta um
certificado ao *nosso* endpoint e nós validamos. Isso exige terminação TLS própria e
não existe em dev. A alternativa documentada pela própria Efí — cadastrar o webhook com
`x-skip-mtls-checking: true` e um **segredo na query string** — é o que este adapter
implementa (comparação em tempo constante, *fail closed* se o segredo não estiver
configurado). Racional completo em [ADR-004](../adr/ADR-004-autenticacao-de-webhook-sem-assinatura.md).

Cadastro (a Efí precisa alcançar a URL na hora do cadastro — em dev, use um túnel):

```bash
curl -X PUT "$EFI_BASE_URL/v2/webhook/$EFI_PIX_KEY" \
  --cert-type P12 --cert "$EFI_CERT_PATH:" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-skip-mtls-checking: true" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl":"https://SEU-TUNEL/webhooks/efi?hmac=SEGREDO"}'
```

Dois detalhes que mordem:

- A Efí **acrescenta `/pix`** à URL cadastrada ao notificar. Por isso o controller mapeia
  `/webhooks/efi` **e** `/webhooks/efi/pix` — o primeiro recebe o ping de configuração,
  o segundo as notificações reais.
- O ping (`{"evento":"teste_webhook"}`) não traz `pix`: vira lista vazia de eventos,
  é registrado em `webhook_events` e responde 200 `ignored`.

Payload real:

```json
{"pix":[{"endToEndId":"E09089356...","txid":"ARINPAY...","chave":"...","valor":"320.00","horario":"2026-08-02T12:03:41.000Z"}]}
```

Cada item é deduplicado **individualmente** por `endToEndId` (`uq_webhook_dedupe`), então
lote reenviado não liquida nada duas vezes.

Devolução (refund) ainda não é tratada: a notificação de devolução chega com o mesmo
`endToEndId` do pix original e morre no dedupe como `duplicate`. Entra quando o produto
tiver o fluxo de estorno.

## 4. Fluxo ponta a ponta

```
POST /bff/charges (Idempotency-Key)
  → payments-core: charge CREATED, txid = ARINPAY<id><hash>
  → EfiAdapter: OAuth (mTLS) → PUT /v2/cob/{txid} → pixCopiaECola
  → charge PENDING + payload JSONB com o EMV
  → front mostra o QR (P07)
pagamento no app do banco
  → Efí POST /webhooks/efi/pix?hmac=...
  → WebhookService: registra cru → charge SETTLED + outbox charge.settled (MESMA transação)
  → worker Go: invoice PAID (I7)
  → polling do front: carimbo PAGA
```

O `txid` é gerado por nós e estável por charge — o mesmo `PUT` repetido devolve a mesma
cobrança em vez de criar outra, o que estende a idempotência do I1 até dentro do PSP.

## 5. Testes

`EfiAdapterTest` sobe um WireMock e cobre: Basic no `/oauth/token`, corpo do `PUT /v2/cob`,
reuso do token entre cobranças, renovação com skew de 60s, 401 → reautentica e reenvia,
fallback do `loc/qrcode`, retry só em 5xx/I-O, 4xx sem retry preservando a mensagem da Efí,
e a tradução de `ATIVA`/`CONCLUIDA`/`REMOVIDA_PELO_PSP`/desconhecido.

`EfiWebhookIntegrationTest` (Testcontainers) cobre o pipeline: segredo errado → 401 com o
corpo registrado, ping → 200 sem efeito, notificação válida → `SETTLED` + outbox,
replay → `duplicate`, lote com 2 pix deduplicado item a item.

**Não coberto por teste automatizado:** o handshake mTLS em si (exige o `.p12` real da Efí
— certificado de teste no repositório seria segredo versionado sem valor de verificação).
Verificação manual: com as variáveis acima, `POST /bff/charges` no front do P07 devolve um
EMV real da Efí e o app do banco em homologação o lê.
