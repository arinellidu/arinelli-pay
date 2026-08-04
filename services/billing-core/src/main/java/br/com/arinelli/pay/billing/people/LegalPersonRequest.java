package br.com.arinelli.pay.billing.people;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Obrigatórios primários da PJ: CNPJ, nome da empresa, e-mail e telefone de
 * contato — e o responsável legal, que precisa existir como pessoa física.
 */
record LegalPersonRequest(
        @NotBlank @Size(max = 160) String razaoSocial,
        @Size(max = 160) String nomeFantasia,
        @NotBlank String cnpj,
        @NotBlank @Size(max = 160) String emailContato,
        @NotBlank String telefoneContato,
        @NotNull Long responsavelId,
        String cep,
        @Size(max = 160) String logradouro,
        @Size(max = 20) String numero,
        @Size(max = 80) String complemento,
        @Size(max = 80) String bairro,
        @Size(max = 80) String cidade,
        @Size(max = 2) String uf) {
}
