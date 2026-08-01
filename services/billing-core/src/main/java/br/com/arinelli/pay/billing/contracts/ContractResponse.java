package br.com.arinelli.pay.billing.contracts;

import br.com.arinelli.pay.billing.clients.DocumentType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/** DTO com tudo que a UI usa no card E na tabela de contratos (P07). */
public record ContractResponse(
        Long id,
        Long clientId,
        String clientName,
        String clientDocument,
        DocumentType clientDocumentType,
        String title,
        BigDecimal amount,
        short billingDay,
        ContractStatus status,
        LocalDate nextDueDate,
        OffsetDateTime createdAt) {

    static ContractResponse from(Contract contract, LocalDate nextDueDate) {
        return new ContractResponse(
                contract.getId(),
                contract.getClient().getId(),
                contract.getClient().getName(),
                contract.getClient().getDocument(),
                contract.getClient().getDocumentType(),
                contract.getTitle(),
                contract.getAmount(),
                contract.getBillingDay(),
                contract.getStatus(),
                nextDueDate,
                contract.getCreatedAt());
    }
}
