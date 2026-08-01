package br.com.arinelli.pay.payments.charges;

import jakarta.validation.constraints.NotNull;

public record ChargeRequest(
        @NotNull Long invoiceId,
        @NotNull ChargeRail rail) {
}
