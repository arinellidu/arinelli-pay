package br.com.arinelli.pay.billing.people;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/** Mapeia natural_persons da 0002 (I6: schema é o contrato, ddl-auto=validate). */
@Entity
@Table(name = "natural_persons")
public class NaturalPerson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 160)
    private String fullName;

    @Column(nullable = false, length = 11)
    private String cpf;

    @Column(length = 160)
    private String email;

    @Column(length = 11)
    private String phone;

    @Embedded
    private Address address;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected NaturalPerson() {
    }

    public NaturalPerson(String fullName, String cpf, String email, String phone, Address address) {
        this.fullName = fullName;
        this.cpf = cpf;
        this.email = email;
        this.phone = phone;
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

    public String getFullName() {
        return fullName;
    }

    public String getCpf() {
        return cpf;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public Address getAddress() {
        return address;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
