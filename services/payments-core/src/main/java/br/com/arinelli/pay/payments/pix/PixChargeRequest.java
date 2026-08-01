package br.com.arinelli.pay.payments.pix;

import java.math.BigDecimal;

/** Pedido de cobrança Pix em tipos do domínio (I3: BigDecimal, escala 2). */
public record PixChargeRequest(String txid, BigDecimal amount, String description) {
}
