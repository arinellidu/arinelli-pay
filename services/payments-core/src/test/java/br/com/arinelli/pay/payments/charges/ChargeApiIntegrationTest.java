package br.com.arinelli.pay.payments.charges;

import br.com.arinelli.pay.payments.TestcontainersConfiguration;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

/** Aceite do P03: idempotência total no POST /charges, inclusive sob corrida (I1). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ChargeApiIntegrationTest {

    private static Long openInvoiceId;
    private static Long paidInvoiceId;
    private static Long firstChargeId;

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private JdbcClient jdbc;

    private ResponseEntity<ChargeResponse> post(String key, Object body) {
        HttpHeaders headers = new HttpHeaders();
        if (key != null) {
            headers.set("Idempotency-Key", key);
        }
        return rest.postForEntity("/charges", new HttpEntity<>(body, headers), ChargeResponse.class);
    }

    @Test
    @Order(1)
    void seedDadosDeBilling() {
        Long clientId = jdbc.sql("""
                insert into clients (document, document_type, name) values
                ('98765432100', 'CPF', 'Cliente P03') returning id
                """).query(Long.class).single();
        Long contractId = jdbc.sql("""
                insert into contracts (client_id, title, amount, billing_day) values
                (:c, 'Contrato P03', 480.00, 15) returning id
                """).param("c", clientId).query(Long.class).single();
        openInvoiceId = jdbc.sql("""
                insert into invoices (contract_id, amount, due_date, status) values
                (:k, 480.00, date '2026-08-15', 'OPEN') returning id
                """).param("k", contractId).query(Long.class).single();
        paidInvoiceId = jdbc.sql("""
                insert into invoices (contract_id, amount, due_date, status, paid_at) values
                (:k, 480.00, date '2026-07-15', 'PAID', now()) returning id
                """).param("k", contractId).query(Long.class).single();

        assertThat(openInvoiceId).isNotNull();
    }

    @Test
    @Order(2)
    void semIdempotencyKeyRetorna400() {
        ResponseEntity<ProblemDetail> response = rest.postForEntity(
                "/charges",
                Map.of("invoiceId", openInvoiceId, "rail", "PIX"),
                ProblemDetail.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getTitle()).isEqualTo("Header obrigatório ausente");
    }

    @Test
    @Order(3)
    void primeiraChamadaCria201PendingComEmv() {
        ResponseEntity<ChargeResponse> response = post("k1-p03", new ChargeRequest(openInvoiceId, ChargeRail.PIX));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        ChargeResponse charge = response.getBody();
        assertThat(charge).isNotNull();
        firstChargeId = charge.id();
        assertThat(charge.status()).isEqualTo(ChargeStatus.PENDING);
        assertThat(charge.provider()).isEqualTo("fake");
        assertThat(charge.providerRef()).startsWith("fake-ARINPAY");
        assertThat(charge.emv()).startsWith("000201").contains("BR.GOV.BCB.PIX");
        assertThat(charge.invoiceId()).isEqualTo(openInvoiceId);
    }

    @Test
    @Order(4)
    void replayDaMesmaKeyRetorna200ComChargeOriginal() {
        ResponseEntity<ChargeResponse> response = post("k1-p03", new ChargeRequest(openInvoiceId, ChargeRail.PIX));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().id()).isEqualTo(firstChargeId);

        Long count = jdbc.sql("select count(*) from charges where idempotency_key = 'k1-p03'")
                .query(Long.class).single();
        assertThat(count).isEqualTo(1);
    }

    @Test
    @Order(5)
    void corridaDuasThreadsMesmaKeyGeraUmUnicoCharge() throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<ResponseEntity<ChargeResponse>>> futures = List.of(
                    pool.submit(() -> { start.await(); return post("k2-race", new ChargeRequest(openInvoiceId, ChargeRail.PIX)); }),
                    pool.submit(() -> { start.await(); return post("k2-race", new ChargeRequest(openInvoiceId, ChargeRail.PIX)); }));
            start.countDown();

            List<HttpStatus> statuses = List.of(
                    (HttpStatus) futures.get(0).get().getStatusCode(),
                    (HttpStatus) futures.get(1).get().getStatusCode());

            // aceite: UM charge no banco, e os dois lados receberam resposta válida
            assertThat(statuses).allMatch(s -> s == HttpStatus.CREATED || s == HttpStatus.OK);
            assertThat(statuses).contains(HttpStatus.CREATED);

            Long count = jdbc.sql("select count(*) from charges where idempotency_key = 'k2-race'")
                    .query(Long.class).single();
            assertThat(count).isEqualTo(1);

            Long id0 = futures.get(0).get().getBody().id();
            Long id1 = futures.get(1).get().getBody().id();
            assertThat(id0).isEqualTo(id1);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @Order(6)
    void railNaoSuportadoRetorna400() {
        ResponseEntity<ProblemDetail> response = rest.postForEntity(
                "/charges",
                new HttpEntity<>(Map.of("invoiceId", openInvoiceId, "rail", "BOLETO"),
                        headers("k3-boleto")),
                ProblemDetail.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getTitle()).isEqualTo("Trilho não suportado");
    }

    @Test
    @Order(7)
    void faturaInexistente404EPaga409() {
        ResponseEntity<ProblemDetail> notFound = rest.postForEntity(
                "/charges",
                new HttpEntity<>(Map.of("invoiceId", 999999, "rail", "PIX"), headers("k4-miss")),
                ProblemDetail.class);
        assertThat(notFound.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<ProblemDetail> paid = rest.postForEntity(
                "/charges",
                new HttpEntity<>(Map.of("invoiceId", paidInvoiceId, "rail", "PIX"), headers("k5-paid")),
                ProblemDetail.class);
        assertThat(paid.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(paid.getBody().getTitle()).isEqualTo("Fatura não cobrável");
    }

    @Test
    @Order(8)
    void getPorIdEPorFatura() {
        ResponseEntity<ChargeResponse> single = rest.getForEntity("/charges/" + firstChargeId, ChargeResponse.class);
        assertThat(single.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(single.getBody().emv()).startsWith("000201");

        ResponseEntity<ChargeResponse[]> list = rest.getForEntity(
                "/invoices/" + openInvoiceId + "/charges", ChargeResponse[].class);
        assertThat(list.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(list.getBody()).hasSize(2); // k1-p03 + k2-race

        ResponseEntity<ProblemDetail> missing = rest.getForEntity("/charges/999999", ProblemDetail.class);
        assertThat(missing.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    private static HttpHeaders headers(String key) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Idempotency-Key", key);
        return headers;
    }
}
