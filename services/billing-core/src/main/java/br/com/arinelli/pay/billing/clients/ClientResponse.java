package br.com.arinelli.pay.billing.clients;

import java.time.OffsetDateTime;

public record ClientResponse(
        Long id,
        String document,
        DocumentType documentType,
        String name,
        String email,
        OffsetDateTime createdAt) {

    static ClientResponse from(Client client) {
        return new ClientResponse(
                client.getId(),
                client.getDocument(),
                client.getDocumentType(),
                client.getName(),
                client.getEmail(),
                client.getCreatedAt());
    }
}
