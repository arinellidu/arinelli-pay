package br.com.arinelli.pay.payments.webhooks;

import br.com.arinelli.pay.payments.TestcontainersConfiguration;
import br.com.arinelli.pay.payments.charges.ChargeRail;
import br.com.arinelli.pay.payments.charges.ChargeRequest;
import br.com.arinelli.pay.payments.charges.ChargeResponse;
import br.com.arinelli.pay.payments.charges.ChargeStatus;
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
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

/** I5 (assinatura sobre corpo cru + dedupe) e I2 (charge.settled na mesma transação). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class WebhookApiIntegrationTest {

    private static Long invoiceId;
    private static Long chargeId;
    private static String txid;

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private JdbcClient jdbc;

    private ResponseEntity<JsonNode> postWebhook(String body, String signature) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (signature != null) {
            headers.set("X-Signature", signature);
        }
        return rest.postForEntity("/webhooks/pix", new HttpEntity<>(body, headers), JsonNode.class);
    }

    private static String hmac(String body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("test-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    @Order(1)
    void seedFaturaEChargePendente() {
        Long clientId = jdbc.sql("insert into clients (document, document_type, name) values ('93541134780','CPF','Cliente P04') returning id")
                .query(Long.class).single();
        Long contractId = jdbc.sql("insert into contracts (client_id, title, amount, billing_day) values (:c,'Contrato P04',320.00,10) returning id")
                .param("c", clientId).query(Long.class).single();
        invoiceId = jdbc.sql("insert into invoices (contract_id, amount, due_date, status) values (:k,320.00,date '2026-08-10','OPEN') returning id")
                .param("k", contractId).query(Long.class).single();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Idempotency-Key", "p04-charge");
        ResponseEntity<ChargeResponse> charge = rest.postForEntity(
                "/charges",
                new HttpEntity<>(new ChargeRequest(invoiceId, ChargeRail.PIX), headers),
                ChargeResponse.class);
        assertThat(charge.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        chargeId = charge.getBody().id();
        txid = charge.getBody().providerRef();
        assertThat(charge.getBody().status()).isEqualTo(ChargeStatus.PENDING);
    }

    @Test
    @Order(2)
    void assinaturaInvalidaRetorna401ERegistraSignatureFalse() {
        String body = "{\"e2eId\":\"E-BAD-1\",\"txid\":\"" + txid + "\",\"status\":\"CONCLUIDA\"}";

        ResponseEntity<JsonNode> semAssinatura = postWebhook(body, null);
        assertThat(semAssinatura.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<JsonNode> errada = postWebhook(body, "deadbeef".repeat(8));
        assertThat(errada.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // escopado no provider: o mesmo banco atende os testes de todos os trilhos
        Long rejected = jdbc.sql("select count(*) from webhook_events where provider = 'pix' and signature_ok = false")
                .query(Long.class).single();
        assertThat(rejected).isEqualTo(2);

        // nada mudou na charge
        Long settled = jdbc.sql("select count(*) from charges where id = :id and status = 'SETTLED'")
                .param("id", chargeId).query(Long.class).single();
        assertThat(settled).isZero();
    }

    @Test
    @Order(3)
    void webhookValidoLiquidaChargeEGravaOutboxNaMesmaTransacao() throws Exception {
        String body = "{\"e2eId\":\"E2E-P04-001\",\"txid\":\"" + txid + "\",\"status\":\"CONCLUIDA\",\"amount\":\"320.00\"}";
        ResponseEntity<JsonNode> response = postWebhook(body, hmac(body));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().path("result").asString()).isEqualTo("processed");

        ResponseEntity<ChargeResponse> charge = rest.getForEntity("/charges/" + chargeId, ChargeResponse.class);
        assertThat(charge.getBody().status()).isEqualTo(ChargeStatus.SETTLED);
        assertThat(charge.getBody().settledAt()).isNotNull();

        Long outboxCount = jdbc.sql("select count(*) from outbox_events where type = 'charge.settled' and aggregate_id = :id")
                .param("id", chargeId).query(Long.class).single();
        assertThat(outboxCount).isEqualTo(1);

        String payloadInvoiceId = jdbc.sql("select payload->>'invoiceId' from outbox_events where aggregate_id = :id")
                .param("id", chargeId).query(String.class).single();
        String payloadE2e = jdbc.sql("select payload->>'e2eId' from outbox_events where aggregate_id = :id")
                .param("id", chargeId).query(String.class).single();
        assertThat(payloadInvoiceId).isEqualTo(String.valueOf(invoiceId));
        assertThat(payloadE2e).isEqualTo("E2E-P04-001");
    }

    @Test
    @Order(4)
    void replayDoMesmoE2eIdRetorna200SemReprocessar() throws Exception {
        String body = "{\"e2eId\":\"E2E-P04-001\",\"txid\":\"" + txid + "\",\"status\":\"CONCLUIDA\",\"amount\":\"320.00\"}";
        ResponseEntity<JsonNode> response = postWebhook(body, hmac(body));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().path("result").asString()).isEqualTo("duplicate");

        Long outboxCount = jdbc.sql("select count(*) from outbox_events where type = 'charge.settled' and aggregate_id = :id")
                .param("id", chargeId).query(Long.class).single();
        assertThat(outboxCount).isEqualTo(1); // não duplicou o efeito
    }

    @Test
    @Order(5)
    void chargeDesconhecidaEStatusNaoConclusivoNaoGeramEfeito() throws Exception {
        String unknown = "{\"e2eId\":\"E2E-P04-404\",\"txid\":\"NAOEXISTE123\",\"status\":\"CONCLUIDA\"}";
        ResponseEntity<JsonNode> unknownResponse = postWebhook(unknown, hmac(unknown));
        assertThat(unknownResponse.getBody().path("result").asString()).isEqualTo("unknown_charge");

        String devolvida = "{\"e2eId\":\"E2E-P04-DEV\",\"txid\":\"" + txid + "\",\"status\":\"DEVOLVIDA\"}";
        ResponseEntity<JsonNode> ignored = postWebhook(devolvida, hmac(devolvida));
        assertThat(ignored.getBody().path("result").asString()).isEqualTo("ignored");

        Long outboxTotal = jdbc.sql("select count(*) from outbox_events where aggregate_id = :id")
                .param("id", chargeId).query(Long.class).single();
        assertThat(outboxTotal).isEqualTo(1);
    }

    @Test
    @Order(6)
    void payloadSemE2eIdRetorna400() throws Exception {
        String body = "{\"txid\":\"" + txid + "\",\"status\":\"CONCLUIDA\"}";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Signature", hmac(body));
        ResponseEntity<ProblemDetail> response = rest.postForEntity(
                "/webhooks/pix", new HttpEntity<>(body, headers), ProblemDetail.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @Order(7)
    void statusDaFaturaConsolidaChargeParaPollingDaUi() {
        ResponseEntity<JsonNode> response = rest.getForEntity("/invoices/" + invoiceId + "/status", JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = response.getBody();
        // invoice ainda OPEN: quem vira PAID é o worker Go consumindo o outbox (I7)
        assertThat(body.path("status").asString()).isEqualTo("OPEN");
        assertThat(body.path("charge").path("rail").asString()).isEqualTo("PIX");
        assertThat(body.path("charge").path("status").asString()).isEqualTo("SETTLED");

        ResponseEntity<ProblemDetail> missing = rest.getForEntity("/invoices/999999/status", ProblemDetail.class);
        assertThat(missing.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @Order(8)
    void corpoNaoJsonComAssinaturaInvalidaEntraEmbrulhado() {
        ResponseEntity<JsonNode> response = postWebhook("isto nao é json", "00");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        Long wrapped = jdbc.sql("select count(*) from webhook_events where provider = 'pix' and signature_ok = false and jsonb_exists(raw_body, '_unparsed')")
                .query(Long.class).single();
        assertThat(wrapped).isEqualTo(1);
    }
}
