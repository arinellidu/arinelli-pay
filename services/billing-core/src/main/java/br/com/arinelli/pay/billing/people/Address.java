package br.com.arinelli.pay.billing.people;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** Endereço opcional (preenchido via CEP no front) — mesmas colunas nas duas tabelas de pessoa. */
@Embeddable
public class Address {

    @Column(name = "zip_code", length = 8)
    private String zipCode;

    @Column(length = 160)
    private String street;

    @Column(name = "address_number", length = 20)
    private String addressNumber;

    @Column(length = 80)
    private String complement;

    @Column(length = 80)
    private String district;

    @Column(length = 80)
    private String city;

    @Column(length = 2)
    private String state;

    protected Address() {
    }

    public Address(String zipCode, String street, String addressNumber, String complement,
                   String district, String city, String state) {
        this.zipCode = zipCode;
        this.street = street;
        this.addressNumber = addressNumber;
        this.complement = complement;
        this.district = district;
        this.city = city;
        this.state = state;
    }

    public String getZipCode() {
        return zipCode;
    }

    public String getStreet() {
        return street;
    }

    public String getAddressNumber() {
        return addressNumber;
    }

    public String getComplement() {
        return complement;
    }

    public String getDistrict() {
        return district;
    }

    public String getCity() {
        return city;
    }

    public String getState() {
        return state;
    }
}
