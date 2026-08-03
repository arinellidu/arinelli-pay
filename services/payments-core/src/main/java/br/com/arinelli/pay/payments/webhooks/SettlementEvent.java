package br.com.arinelli.pay.payments.webhooks;

/**
 * Notificação de um provider já traduzida para o vocabulário do domínio (I4):
 * nenhum tipo/campo de PSP chega ao pipeline comum.
 *
 * @param dedupeKey identificador único do evento no provider (e2eId no Pix) — vira {@code webhook_events.dedupe_key}
 * @param txid      referência da cobrança, casada com {@code charges.provider_ref}
 * @param settles   {@code true} só quando o provider confirma pagamento; qualquer outro estado é registrado e ignorado
 */
public record SettlementEvent(String dedupeKey, String txid, boolean settles) {
}
