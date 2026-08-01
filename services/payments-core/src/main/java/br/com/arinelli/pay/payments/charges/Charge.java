package br.com.arinelli.pay.payments.charges;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

/**
 * Mapeia charges do baseline 0001 (I6). invoice_id fica como escalar: a entidade
 * Invoice pertence ao billing-core; aqui o vínculo é só a FK do banco.
 */
@Entity
@Table(name = "charges")
public class Charge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_id", nullable = false)
    private Long invoiceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private ChargeRail rail;

    @Column(nullable = false, length = 16)
    private String provider;

    @Column(name = "provider_ref", length = 80)
    private String providerRef;

    @Column(name = "idempotency_key", nullable = false, length = 64)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ChargeStatus status = ChargeStatus.CREATED;

    @Column(name = "failure_code", length = 32)
    private String failureCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String payload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "settled_at")
    private OffsetDateTime settledAt;

    protected Charge() {
    }

    public Charge(Long invoiceId, ChargeRail rail, String provider, String idempotencyKey) {
        this.invoiceId = invoiceId;
        this.rail = rail;
        this.provider = provider;
        this.idempotencyKey = idempotencyKey;
        this.status = ChargeStatus.CREATED;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    /** CREATED → PENDING com referência e payload do provider. */
    public void markPending(String providerRef, String payload) {
        this.providerRef = providerRef;
        this.payload = payload;
        this.status = ChargeStatus.PENDING;
    }

    /** PENDING → SETTLED por webhook verificado (I5/I7); nunca por request do front. */
    public void markSettled(OffsetDateTime when) {
        this.status = ChargeStatus.SETTLED;
        this.settledAt = when;
    }

    public Long getId() {
        return id;
    }

    public Long getInvoiceId() {
        return invoiceId;
    }

    public ChargeRail getRail() {
        return rail;
    }

    public String getProvider() {
        return provider;
    }

    public String getProviderRef() {
        return providerRef;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public ChargeStatus getStatus() {
        return status;
    }

    public String getFailureCode() {
        return failureCode;
    }

    public String getPayload() {
        return payload;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getSettledAt() {
        return settledAt;
    }
}
