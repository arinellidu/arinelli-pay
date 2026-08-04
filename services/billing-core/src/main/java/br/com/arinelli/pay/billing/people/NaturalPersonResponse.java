package br.com.arinelli.pay.billing.people;

import java.time.OffsetDateTime;

/** Contrato de leitura idêntico ao que o mock do BFF servia — o front não muda. */
record NaturalPersonResponse(
        Long id,
        String nome,
        String cpf,
        String email,
        String telefone,
        String cep,
        String logradouro,
        String numero,
        String complemento,
        String bairro,
        String cidade,
        String uf,
        OffsetDateTime criadoEm) {

    static NaturalPersonResponse from(NaturalPerson person) {
        Address address = person.getAddress();
        return new NaturalPersonResponse(
                person.getId(),
                person.getFullName(),
                person.getCpf(),
                person.getEmail(),
                person.getPhone(),
                address == null ? null : address.getZipCode(),
                address == null ? null : address.getStreet(),
                address == null ? null : address.getAddressNumber(),
                address == null ? null : address.getComplement(),
                address == null ? null : address.getDistrict(),
                address == null ? null : address.getCity(),
                address == null ? null : address.getState(),
                person.getCreatedAt());
    }
}
