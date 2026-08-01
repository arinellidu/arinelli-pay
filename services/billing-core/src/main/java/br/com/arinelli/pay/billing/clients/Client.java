package br.com.arinelli.pay.billing.clients;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/** Mapeia a tabela clients do baseline 0001 (I6: schema é o contrato, ddl-auto=validate). */
@Entity
@Table(name = "clients")
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 14)
    private String document;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 4)
    private DocumentType documentType;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 160)
    private String email;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Client() {
    }

    public Client(String document, DocumentType documentType, String name, String email) {
        this.document = document;
        this.documentType = documentType;
        this.name = name;
        this.email = email;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    public void update(String document, DocumentType documentType, String name, String email) {
        this.document = document;
        this.documentType = documentType;
        this.name = name;
        this.email = email;
    }

    public Long getId() {
        return id;
    }

    public String getDocument() {
        return document;
    }

    public DocumentType getDocumentType() {
        return documentType;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
