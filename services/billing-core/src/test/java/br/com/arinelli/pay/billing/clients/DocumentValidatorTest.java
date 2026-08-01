package br.com.arinelli.pay.billing.clients;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class DocumentValidatorTest {

    // ---------- CPF ----------

    @ParameterizedTest
    @ValueSource(strings = {
            "52998224725",
            "11144477735",
            "12345678909",
            "93541134780",
            "45321987637",
            "98765432100"
    })
    void cpfValido(String cpf) {
        assertThat(DocumentValidator.isValidCpf(cpf)).isTrue();
        assertThat(DocumentValidator.validate(cpf)).contains(DocumentType.CPF);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "11111111111",  // sequência repetida
            "00000000000",  // sequência repetida
            "52998224726",  // DV errado
            "12345678908",  // DV errado
            "5299822472",   // tamanho errado (10)
            "529982247251"  // tamanho errado (12)
    })
    void cpfInvalido(String cpf) {
        assertThat(DocumentValidator.isValidCpf(cpf)).isFalse();
        assertThat(DocumentValidator.validate(cpf)).isEmpty();
    }

    // ---------- CNPJ ----------

    @ParameterizedTest
    @ValueSource(strings = {
            "11222333000181",
            "11444777000161",
            "34028316000103",
            "00000000000191",
            "33000167000101",
            "60701190000104"
    })
    void cnpjValido(String cnpj) {
        assertThat(DocumentValidator.isValidCnpj(cnpj)).isTrue();
        assertThat(DocumentValidator.validate(cnpj)).contains(DocumentType.CNPJ);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "11111111111111",  // sequência repetida
            "00000000000000",  // sequência repetida
            "11222333000180",  // DV errado
            "11444777000162",  // DV errado
            "1122233300018",   // tamanho errado (13)
            "112223330001811"  // tamanho errado (15)
    })
    void cnpjInvalido(String cnpj) {
        assertThat(DocumentValidator.isValidCnpj(cnpj)).isFalse();
        assertThat(DocumentValidator.validate(cnpj)).isEmpty();
    }

    // ---------- normalize ----------

    @ParameterizedTest
    @CsvSource({
            "529.982.247-25, 52998224725",
            "11.222.333/0001-81, 11222333000181",
            "'  529 982 247 25  ', 52998224725",
            "abc, ''"
    })
    void normalizeRemoveMascara(String raw, String expected) {
        assertThat(DocumentValidator.normalize(raw)).isEqualTo(expected);
    }

    @Test
    void normalizeNullViraVazio() {
        assertThat(DocumentValidator.normalize(null)).isEmpty();
    }

    @Test
    void tamanhoIntermediarioNaoInfereTipo() {
        assertThat(DocumentValidator.validate("123456789012")).isEmpty(); // 12 dígitos: nem CPF nem CNPJ
    }
}
