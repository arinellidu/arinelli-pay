package br.com.arinelli.pay.payments.charges;

import java.time.OffsetDateTime;

public record ChargeResponse(
        Long id,
        Long invoiceId,
        ChargeRail rail,
        String provider,
        String providerRef,
        ChargeStatus status,
        String emv,
        OffsetDateTime createdAt,
        OffsetDateTime settledAt) {
}
