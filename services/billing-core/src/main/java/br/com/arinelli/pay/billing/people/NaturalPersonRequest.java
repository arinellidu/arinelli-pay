package br.com.arinelli.pay.billing.people;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Contrato de escrita no vocabulário da UI (o BFF repassa o payload do
 * formulário como está). Obrigatórios primários: só nome e CPF; o resto,
 * inclusive endereço, é opcional.
 */
record NaturalPersonRequest(
        @NotBlank @Size(max = 160) String nome,
        @NotBlank String cpf,
        @Size(max = 160) String email,
        String telefone,
        String cep,
        @Size(max = 160) String logradouro,
        @Size(max = 20) String numero,
        @Size(max = 80) String complemento,
        @Size(max = 80) String bairro,
        @Size(max = 80) String cidade,
        @Size(max = 2) String uf) {
}
