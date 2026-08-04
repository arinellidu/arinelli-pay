package br.com.arinelli.pay.billing.people;

import java.time.OffsetDateTime;

/** Contrato de leitura idêntico ao do mock: responsável legal embutido. */
record LegalPersonResponse(
        Long id,
        String razaoSocial,
        String nomeFantasia,
        String cnpj,
        String emailContato,
        String telefoneContato,
        Responsavel responsavel,
        String cep,
        String logradouro,
        String numero,
        String complemento,
        String bairro,
        String cidade,
        String uf,
        OffsetDateTime criadoEm) {

    record Responsavel(Long id, String nome, String cpf) {
    }

    static LegalPersonResponse from(LegalPerson company) {
        Address address = company.getAddress();
        NaturalPerson responsible = company.getResponsible();
        return new LegalPersonResponse(
                company.getId(),
                company.getCorporateName(),
                company.getTradeName(),
                company.getCnpj(),
                company.getContactEmail(),
                company.getContactPhone(),
                new Responsavel(responsible.getId(), responsible.getFullName(), responsible.getCpf()),
                address == null ? null : address.getZipCode(),
                address == null ? null : address.getStreet(),
                address == null ? null : address.getAddressNumber(),
                address == null ? null : address.getComplement(),
                address == null ? null : address.getDistrict(),
                address == null ? null : address.getCity(),
                address == null ? null : address.getState(),
                company.getCreatedAt());
    }
}
