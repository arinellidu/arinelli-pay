package br.com.arinelli.pay.payments.pix;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Retrato da cobrança no provider (I3: valor em BigDecimal).
 * {@code e2eId}, {@code amount} e {@code paidAt} só vêm preenchidos quando {@link PixStatus#SETTLED}.
 */
public record PixChargeStatus(
        String txid,
        PixStatus status,
        String e2eId,
        BigDecimal amount,
        OffsetDateTime paidAt) {

    public static PixChargeStatus unknown(String txid) {
        return new PixChargeStatus(txid, PixStatus.UNKNOWN, null, null, null);
    }
}
