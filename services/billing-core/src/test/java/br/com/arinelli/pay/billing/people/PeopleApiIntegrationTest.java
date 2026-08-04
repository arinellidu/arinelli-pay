package br.com.arinelli.pay.billing.people;

import br.com.arinelli.pay.billing.TestcontainersConfiguration;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cadastro de pessoas com Postgres real + Flyway (I6): a 0002 cria as tabelas,
 * a 0003 semeia a demo — o teste nasce com 4 PF e 2 PJ e valida em cima disso.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PeopleApiIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @Test
    @Order(1)
    void seedDaDemoVemDaMigrationComResponsavelResolvido() {
        ResponseEntity<JsonNode> fisicas = rest.getForEntity("/people/pf", JsonNode.class);
        assertThat(fisicas.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(fisicas.getBody().size()).isGreaterThanOrEqualTo(4);

        ResponseEntity<JsonNode> juridicas = rest.getForEntity("/people/pj", JsonNode.class);
        assertThat(juridicas.getBody().size()).isGreaterThanOrEqualTo(2);
        JsonNode aurora = null;
        for (JsonNode pj : juridicas.getBody()) {
            if ("11222333000181".equals(pj.path("cnpj").asString())) {
                aurora = pj;
            }
        }
        assertThat(aurora).isNotNull();
        assertThat(aurora.path("responsavel").path("nome").asString()).isEqualTo("Helena Prado Martins");
        assertThat(aurora.path("responsavel").path("cpf").asString()).isEqualTo("52998224725");
    }

    @Test
    @Order(2)
    void postPfComMascaraNormalizaECria201ComLocation() {
        ResponseEntity<JsonNode> response = rest.postForEntity("/people/pf", Map.of(
                "nome", "  Ana Souza  ",
                "cpf", "287.244.093-32",
                "telefone", "(31) 98412-0000"), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation()).isNotNull();
        assertThat(response.getBody().path("nome").asString()).isEqualTo("Ana Souza");
        assertThat(response.getBody().path("cpf").asString()).isEqualTo("28724409332");
        assertThat(response.getBody().path("telefone").asString()).isEqualTo("31984120000");

        // recém-criada lidera a lista (created_at desc)
        ResponseEntity<JsonNode> lista = rest.getForEntity("/people/pf", JsonNode.class);
        assertThat(lista.getBody().get(0).path("cpf").asString()).isEqualTo("28724409332");
    }

    @Test
    @Order(3)
    void postPfComCpfInvalidoRetorna400() {
        ResponseEntity<ProblemDetail> response = rest.postForEntity("/people/pf", Map.of(
                "nome", "Dígito Errado",
                "cpf", "28724409333"), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getTitle()).isEqualTo("Documento inválido");
    }

    @Test
    @Order(4)
    void postPfComCpfDoSeedRetorna409() {
        ResponseEntity<ProblemDetail> response = rest.postForEntity("/people/pf", Map.of(
                "nome", "Helena Clone",
                "cpf", "52998224725"), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().getTitle()).isEqualTo("Documento duplicado");
    }

    @Test
    @Order(5)
    void postPjAtreladaAPfDoSeedCria201ComResponsavelEmbutido() {
        ResponseEntity<JsonNode> response = rest.postForEntity("/people/pj", Map.of(
                "razaoSocial", "Sarmento Consultoria LTDA",
                "cnpj", "48.560.263/0001-81",
                "emailContato", "oi@sarmento.com.br",
                "telefoneContato", "31984120977",
                "responsavelId", 3), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().path("cnpj").asString()).isEqualTo("48560263000181");
        assertThat(response.getBody().path("responsavel").path("nome").asString())
                .isEqualTo("Beatriz Sarmento Duarte");
    }

    @Test
    @Order(6)
    void postPjComResponsavelInexistenteRetorna422() {
        ResponseEntity<ProblemDetail> response = rest.postForEntity("/people/pj", Map.of(
                "razaoSocial", "Fantasma LTDA",
                "cnpj", "44.556.677/0001-86",
                "emailContato", "x@y.com.br",
                "telefoneContato", "1130074521",
                "responsavelId", 99999), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT);
        assertThat(response.getBody().getTitle()).isEqualTo("Responsável legal não encontrado");
    }

    @Test
    @Order(7)
    void postPjComCnpjDoSeedRetorna409() {
        ResponseEntity<ProblemDetail> response = rest.postForEntity("/people/pj", Map.of(
                "razaoSocial", "Aurora Clone LTDA",
                "cnpj", "11222333000181",
                "emailContato", "x@y.com.br",
                "telefoneContato", "1130074521",
                "responsavelId", 1), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }
}
