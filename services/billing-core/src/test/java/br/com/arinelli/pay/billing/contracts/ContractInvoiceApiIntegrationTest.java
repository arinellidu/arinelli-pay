package br.com.arinelli.pay.billing.contracts;

import br.com.arinelli.pay.billing.TestcontainersConfiguration;
import br.com.arinelli.pay.billing.clients.ClientRequest;
import br.com.arinelli.pay.billing.clients.ClientResponse;
import br.com.arinelli.pay.billing.invoices.DueDateRule;
import br.com.arinelli.pay.billing.invoices.InvoiceResponse;
import br.com.arinelli.pay.billing.invoices.InvoiceService;
import br.com.arinelli.pay.billing.invoices.InvoiceStatus;
import tools.jackson.databind.JsonNode;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Import(TestcontainersConfiguration.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ContractInvoiceApiIntegrationTest {

    private static Long clientId;
    private static Long contractId;

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private InvoiceService invoiceService;

    @Test
    @Order(1)
    void postContractCria201ComDtoCompleto() {
        // CPF distinto do usado no ClientApiIntegrationTest: o contexto Spring (e o
        // container Postgres) é cacheado e compartilhado entre as classes de teste.
        ResponseEntity<ClientResponse> client = rest.postForEntity(
                "/clients",
                new ClientRequest("111.444.777-35", "Cliente P02", "p02@example.com"),
                ClientResponse.class);
        assertThat(client.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        clientId = client.getBody().id();

        ResponseEntity<ContractResponse> contract = rest.postForEntity(
                "/contracts",
                new ContractRequest(clientId, "Mensalidade Pilates", new BigDecimal("250.00"), (short) 28),
                ContractResponse.class);

        assertThat(contract.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        ContractResponse body = contract.getBody();
        assertThat(body).isNotNull();
        contractId = body.id();
        // DTO de card E tabela: cliente embutido + próximo vencimento calculado
        assertThat(body.clientId()).isEqualTo(clientId);
        assertThat(body.clientName()).isEqualTo("Cliente P02");
        assertThat(body.clientDocument()).isEqualTo("11144477735");
        assertThat(body.amount()).isEqualByComparingTo("250.00");
        assertThat(body.billingDay()).isEqualTo((short) 28);
        assertThat(body.status()).isEqualTo(ContractStatus.ACTIVE);
        assertThat(body.nextDueDate())
                .isEqualTo(DueDateRule.nextDueDate(LocalDate.now(), 28, null));
        assertThat(body.createdAt()).isNotNull();
    }

    @Test
    @Order(2)
    void postContractClienteInexistente404() {
        ResponseEntity<ProblemDetail> response = rest.postForEntity(
                "/contracts",
                new ContractRequest(999999L, "Contrato Fantasma", new BigDecimal("10.00"), (short) 5),
                ProblemDetail.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @Order(3)
    void postContractBillingDay31Retorna400() {
        ResponseEntity<ProblemDetail> response = rest.postForEntity(
                "/contracts",
                Map.of("clientId", clientId, "title", "Dia inválido", "amount", 10.00, "billingDay", 31),
                ProblemDetail.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getTitle()).isEqualTo("Corpo da requisição inválido");
    }

    @Test
    @Order(4)
    void generateNextCriaOpenComVencimentoDaRegra() {
        ResponseEntity<InvoiceResponse> response = rest.postForEntity(
                "/contracts/" + contractId + "/invoices:generate-next", null, InvoiceResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        InvoiceResponse invoice = response.getBody();
        assertThat(invoice).isNotNull();
        assertThat(invoice.status()).isEqualTo(InvoiceStatus.OPEN);
        assertThat(invoice.amount()).isEqualByComparingTo("250.00");
        assertThat(invoice.dueDate()).isEqualTo(DueDateRule.nextDueDate(LocalDate.now(), 28, null));
        assertThat(invoice.contractId()).isEqualTo(contractId);
        assertThat(invoice.clientName()).isEqualTo("Cliente P02");
    }

    @Test
    @Order(5)
    void generateNextDeNovoAvancaUmMes() {
        LocalDate first = DueDateRule.nextDueDate(LocalDate.now(), 28, null);

        ResponseEntity<InvoiceResponse> response = rest.postForEntity(
                "/contracts/" + contractId + "/invoices:generate-next", null, InvoiceResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().dueDate()).isEqualTo(first.plusMonths(1).withDayOfMonth(28));
    }

    @Test
    @Order(6)
    void generateNextContratoInexistente404() {
        ResponseEntity<ProblemDetail> response = rest.postForEntity(
                "/contracts/999999/invoices:generate-next", null, ProblemDetail.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @Order(7)
    void getInvoicesFiltraEPagina() {
        ResponseEntity<JsonNode> all = rest.getForEntity(
                "/invoices?clientId=" + clientId + "&status=OPEN", JsonNode.class);
        assertThat(all.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(all.getBody().get("content")).hasSizeGreaterThanOrEqualTo(2);

        ResponseEntity<JsonNode> paged = rest.getForEntity(
                "/invoices?clientId=" + clientId + "&size=1", JsonNode.class);
        assertThat(paged.getBody().get("content")).hasSize(1);
        assertThat(paged.getBody().get("page").get("totalElements").asLong()).isGreaterThanOrEqualTo(2);
        assertThat(paged.getBody().get("page").get("totalPages").asLong()).isGreaterThanOrEqualTo(2);

        // janela de datas que exclui tudo
        ResponseEntity<JsonNode> none = rest.getForEntity(
                "/invoices?from=2000-01-01&to=2000-12-31", JsonNode.class);
        assertThat(none.getBody().get("content")).isEmpty();

        // janela que inclui os vencimentos gerados
        LocalDate first = DueDateRule.nextDueDate(LocalDate.now(), 28, null);
        ResponseEntity<JsonNode> window = rest.getForEntity(
                "/invoices?from=" + first + "&to=" + first.plusMonths(1), JsonNode.class);
        assertThat(window.getBody().get("content")).hasSizeGreaterThanOrEqualTo(2);
    }

    @Test
    @Order(8)
    void statusInvalidoNoFiltroRetorna400ProblemDetail() {
        ResponseEntity<ProblemDetail> response = rest.getForEntity("/invoices?status=NOPE", ProblemDetail.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getTitle()).isEqualTo("Parâmetro inválido");
    }

    @Test
    @Order(9)
    void markOverdueViraApenasVencidas() {
        // as duas faturas geradas vencem no futuro: nada muda com a data de hoje
        assertThat(invoiceService.markOverdue(LocalDate.now())).isZero();

        // com data de referência depois do primeiro vencimento, a primeira vira OVERDUE
        LocalDate afterFirst = DueDateRule.nextDueDate(LocalDate.now(), 28, null).plusDays(1);
        assertThat(invoiceService.markOverdue(afterFirst)).isEqualTo(1);

        ResponseEntity<JsonNode> overdue = rest.getForEntity(
                "/invoices?clientId=" + clientId + "&status=OVERDUE", JsonNode.class);
        assertThat(overdue.getBody().get("content")).hasSize(1);
    }

    @Test
    @Order(10)
    void getContractTrazNextDueDateAvancado() {
        ResponseEntity<ContractResponse> response = rest.getForEntity(
                "/contracts/" + contractId, ContractResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        // duas faturas geradas: próximo vencimento é 2 meses após o primeiro candidato
        LocalDate first = DueDateRule.nextDueDate(LocalDate.now(), 28, null);
        assertThat(response.getBody().nextDueDate()).isEqualTo(first.plusMonths(2).withDayOfMonth(28));

        ResponseEntity<ContractResponse[]> byClient = rest.getForEntity(
                "/contracts?clientId=" + clientId, ContractResponse[].class);
        assertThat(byClient.getBody()).hasSize(1);
    }
}
