package br.com.arinelli.pay.payments.pix;

/**
 * Port de provider Pix (I4): o domínio só conhece esta interface e seus records.
 * Nenhum tipo de SDK/HTTP de provider sai do pacote adapters.
 */
public interface PixProvider {

    /** Nome curto gravado em charges.provider (ex.: "fake", "pix-sandbox", "efi"). */
    String name();

    PixCharge createCharge(PixChargeRequest request);

    /**
     * Consulta a cobrança direto no provider — fonte da verdade quando o webhook
     * não chega. Nunca decide status de fatura (I7): quem liquida é o pipeline de
     * webhook + outbox. Providers de dev (fake, pix-sandbox) não expõem consulta e
     * devolvem {@link PixStatus#UNKNOWN}; adapters reais sobrescrevem.
     */
    default PixChargeStatus consult(String txid) {
        return PixChargeStatus.unknown(txid);
    }
}
