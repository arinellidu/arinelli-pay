package br.com.arinelli.pay.payments.pix;

/**
 * Port de provider Pix (I4): o domínio só conhece esta interface e seus records.
 * Nenhum tipo de SDK/HTTP de provider sai do pacote adapters.
 */
public interface PixProvider {

    /** Nome curto gravado em charges.provider (ex.: "fake", "pix-sandbox"). */
    String name();

    PixCharge createCharge(PixChargeRequest request);
}
