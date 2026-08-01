package br.com.arinelli.pay.payments.pix;

/** Resultado do provider: referência externa + EMV (copia-e-cola / QR). */
public record PixCharge(String providerRef, String emv) {
}
