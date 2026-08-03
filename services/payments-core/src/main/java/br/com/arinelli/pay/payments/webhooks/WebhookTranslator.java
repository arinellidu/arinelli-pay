package br.com.arinelli.pay.payments.webhooks;

import java.util.List;

/**
 * Port de ingestão de webhook (I4). Cada provider entra por aqui: autentica do
 * jeito dele e traduz o payload dele para {@link SettlementEvent}. O que acontece
 * depois — persistir o cru, deduplicar, liquidar a charge e gravar o outbox — é
 * do {@link WebhookService} e é IGUAL para todos os trilhos.
 *
 * <p>Implementações que falam com um PSP real moram em {@code adapters/}; a de dev
 * (HMAC próprio, usada por fake e pix-sandbox) fica aqui mesmo.
 */
public interface WebhookTranslator {

    /** Valor gravado em {@code webhook_events.provider} e usado na rota (máx. 16 chars). */
    String provider();

    /**
     * I5: verificado ou descartado. Recebe os bytes EXATOS do corpo — assinatura
     * calculada sobre qualquer reserialização é assinatura errada.
     */
    boolean authenticate(byte[] rawBody, WebhookRequest request);

    /**
     * Eventos de liquidação contidos no payload. Lista vazia = nada a fazer
     * (ping de configuração, evento de outro tipo) — o corpo ainda é registrado.
     *
     * @throws InvalidWebhookPayloadException se o corpo é ilegível ou não tem o mínimo para deduplicar
     */
    List<SettlementEvent> translate(byte[] rawBody);
}
