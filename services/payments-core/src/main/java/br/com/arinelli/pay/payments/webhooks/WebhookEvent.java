package br.com.arinelli.pay.payments.webhooks;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

/** I5: o corpo cru é persistido ANTES de qualquer processamento; dedupe por (provider, dedupe_key). */
@Entity
@Table(name = "webhook_events")
public class WebhookEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 16)
    private String provider;

    @Column(name = "signature_ok", nullable = false)
    private boolean signatureOk;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_body", nullable = false, columnDefinition = "jsonb")
    private String rawBody;

    @Column(name = "received_at", nullable = false, updatable = false)
    private OffsetDateTime receivedAt;

    @Column(name = "processed_at")
    private OffsetDateTime processedAt;

    @Column(name = "dedupe_key", length = 120)
    private String dedupeKey;

    protected WebhookEvent() {
    }

    public WebhookEvent(String provider, boolean signatureOk, String rawBody, String dedupeKey) {
        this.provider = provider;
        this.signatureOk = signatureOk;
        this.rawBody = rawBody;
        this.dedupeKey = dedupeKey;
    }

    @PrePersist
    void onCreate() {
        if (receivedAt == null) {
            receivedAt = OffsetDateTime.now();
        }
    }

    public void markProcessed(OffsetDateTime when) {
        this.processedAt = when;
    }

    public Long getId() {
        return id;
    }

    public boolean isSignatureOk() {
        return signatureOk;
    }

    public String getDedupeKey() {
        return dedupeKey;
    }

    public OffsetDateTime getProcessedAt() {
        return processedAt;
    }
}
