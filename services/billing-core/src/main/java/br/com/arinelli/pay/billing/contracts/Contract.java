package br.com.arinelli.pay.billing.contracts;

import br.com.arinelli.pay.billing.clients.Client;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Mapeia contracts do baseline 0001 (I6). Dinheiro em BigDecimal/NUMERIC(14,2) (I3). */
@Entity
@Table(name = "contracts")
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "billing_day", nullable = false)
    private short billingDay;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private ContractStatus status = ContractStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Contract() {
    }

    public Contract(Client client, String title, BigDecimal amount, short billingDay) {
        this.client = client;
        this.title = title;
        this.amount = amount;
        this.billingDay = billingDay;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (status == null) {
            status = ContractStatus.ACTIVE;
        }
    }

    public Long getId() {
        return id;
    }

    public Client getClient() {
        return client;
    }

    public String getTitle() {
        return title;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public short getBillingDay() {
        return billingDay;
    }

    public ContractStatus getStatus() {
        return status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
