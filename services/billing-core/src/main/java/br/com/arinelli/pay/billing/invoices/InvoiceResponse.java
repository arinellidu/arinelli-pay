package br.com.arinelli.pay.billing.invoices;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/** DTO de fatura com contexto de contrato e cliente para card e tabela (P07). */
public record InvoiceResponse(
        Long id,
        Long contractId,
        String contractTitle,
        Long clientId,
        String clientName,
        BigDecimal amount,
        LocalDate dueDate,
        InvoiceStatus status,
        OffsetDateTime paidAt,
        OffsetDateTime createdAt) {

    static InvoiceResponse from(Invoice invoice) {
        return new InvoiceResponse(
                invoice.getId(),
                invoice.getContract().getId(),
                invoice.getContract().getTitle(),
                invoice.getContract().getClient().getId(),
                invoice.getContract().getClient().getName(),
                invoice.getAmount(),
                invoice.getDueDate(),
                invoice.getStatus(),
                invoice.getPaidAt(),
                invoice.getCreatedAt());
    }
}
