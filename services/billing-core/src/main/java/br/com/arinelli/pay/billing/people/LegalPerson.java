package br.com.arinelli.pay.billing.people;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/**
 * Mapeia legal_persons da 0002. Toda PJ nasce atrelada a uma PF já cadastrada
 * — o responsável legal (FK NOT NULL no banco).
 */
@Entity
@Table(name = "legal_persons")
public class LegalPerson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "corporate_name", nullable = false, length = 160)
    private String corporateName;

    @Column(name = "trade_name", length = 160)
    private String tradeName;

    @Column(nullable = false, length = 14)
    private String cnpj;

    @Column(name = "contact_email", nullable = false, length = 160)
    private String contactEmail;

    @Column(name = "contact_phone", nullable = false, length = 11)
    private String contactPhone;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "responsible_id", nullable = false)
    private NaturalPerson responsible;

    @Embedded
    private Address address;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected LegalPerson() {
    }

    public LegalPerson(String corporateName, String tradeName, String cnpj, String contactEmail,
                       String contactPhone, NaturalPerson responsible, Address address) {
        this.corporateName = corporateName;
        this.tradeName = tradeName;
        this.cnpj = cnpj;
        this.contactEmail = contactEmail;
        this.contactPhone = contactPhone;
        this.responsible = responsible;
        this.address = address;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public String getCorporateName() {
        return corporateName;
    }

    public String getTradeName() {
        return tradeName;
    }

    public String getCnpj() {
        return cnpj;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public NaturalPerson getResponsible() {
        return responsible;
    }

    public Address getAddress() {
        return address;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
