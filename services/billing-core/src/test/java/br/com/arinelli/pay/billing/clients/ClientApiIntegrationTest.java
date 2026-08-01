package br.com.arinelli.pay.billing.clients;

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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Integração real: Postgres via Testcontainers + Flyway aplicando infra/migrations (I6). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Import(TestcontainersConfiguration.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ClientApiIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @Test
    @Order(1)
    void postCpfComMascaraCria201ENormaliza() {
        ResponseEntity<ClientResponse> response = rest.postForEntity(
                "/clients",
                new ClientRequest("529.982.247-25", "Maria da Silva", "maria@example.com"),
                ClientResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation()).isNotNull();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().document()).isEqualTo("52998224725");
        assertThat(response.getBody().documentType()).isEqualTo(DocumentType.CPF);
        assertThat(response.getBody().createdAt()).isNotNull();
    }

    @Test
    @Order(2)
    void postCnpjComMascaraCria201EInfereTipo() {
        ResponseEntity<ClientResponse> response = rest.postForEntity(
                "/clients",
                new ClientRequest("11.222.333/0001-81", "Padaria Pão Quente LTDA", null),
                ClientResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().document()).isEqualTo("11222333000181");
        assertThat(response.getBody().documentType()).isEqualTo(DocumentType.CNPJ);
    }

    @Test
    @Order(3)
    void postDocumentoDuplicadoRetorna409ProblemDetail() {
        ResponseEntity<ProblemDetail> response = rest.postForEntity(
                "/clients",
                new ClientRequest("52998224725", "Outra Maria", null),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("Documento duplicado");
    }

    @Test
    @Order(4)
    void postDocumentoInvalidoRetorna400ProblemDetail() {
        ResponseEntity<ProblemDetail> response = rest.postForEntity(
                "/clients",
                new ClientRequest("123.456.789-00", "Fulano Inválido", null),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("Documento inválido");
    }

    @Test
    @Order(5)
    void getListaEGetPorIdFuncionam() {
        ResponseEntity<ClientResponse[]> list = rest.getForEntity("/clients", ClientResponse[].class);
        assertThat(list.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(list.getBody()).isNotNull();
        assertThat(list.getBody().length).isGreaterThanOrEqualTo(2);

        Long id = list.getBody()[0].id();
        ResponseEntity<ClientResponse> single = rest.getForEntity("/clients/" + id, ClientResponse.class);
        assertThat(single.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(single.getBody()).isNotNull();
        assertThat(single.getBody().id()).isEqualTo(id);
    }

    @Test
    @Order(6)
    void getInexistenteRetorna404ProblemDetail() {
        ResponseEntity<ProblemDetail> response = rest.getForEntity("/clients/999999", ProblemDetail.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("Recurso não encontrado");
    }

    @Test
    @Order(7)
    void putAtualizaNomeEEmail() {
        ResponseEntity<ClientResponse[]> list = rest.getForEntity("/clients", ClientResponse[].class);
        assertThat(list.getBody()).isNotNull();
        ClientResponse first = list.getBody()[0];

        ResponseEntity<ClientResponse> updated = rest.exchange(
                "/clients/" + first.id(),
                HttpMethod.PUT,
                new HttpEntity<>(new ClientRequest(first.document(), "Maria Atualizada", "nova@example.com")),
                ClientResponse.class);

        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updated.getBody()).isNotNull();
        assertThat(updated.getBody().name()).isEqualTo("Maria Atualizada");
        assertThat(updated.getBody().email()).isEqualTo("nova@example.com");
        assertThat(updated.getBody().document()).isEqualTo(first.document());
    }

    @Test
    @Order(8)
    void postCorpoInvalidoRetorna400ProblemDetail() {
        ResponseEntity<ProblemDetail> response = rest.postForEntity(
                "/clients",
                Map.of("document", "52998224725", "name", ""),
                ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("Corpo da requisição inválido");
    }
}
