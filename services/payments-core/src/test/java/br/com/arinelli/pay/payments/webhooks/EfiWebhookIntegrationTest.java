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
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * P08: o webhook da Efí converge para o MESMO pipeline do P04 — muda o tradutor
 * (autenticação por segredo na query, payload {@code {"pix":[...]}}), não o efeito.
 *
 * <p>A charge é criada pelo provider {@code fake} porque o que correlaciona webhook e
 * charge é o {@code provider_ref}, e o txid é NOSSO: idêntico em fake, pix-sandbox e Efí.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class EfiWebhookIntegrationTest {

    private static final String SECRET = "efi-test-secret";

    private static Long invoiceId;
    private static Long chargeId;
    private static String txid;
    private static Long outroChargeId;
    private static String outroTxid;

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private JdbcClient jdbc;

    private ResponseEntity<JsonNode> postEfi(String path, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return rest.postForEntity(path, new HttpEntity<>(body, headers), JsonNode.class);
    }

    private static String pixNotification(String e2eId, String txid) {
        return """
                {"pix":[{"endToEndId":"%s","txid":"%s","chave":"pagamentos@arinelli.dev",\
                "valor":"320.00","horario":"2026-08-02T12:03:41.000Z"}]}""".formatted(e2eId, txid);
    }

    private long webhookEventsEfi(String where) {
        return jdbc.sql("select count(*) from webhook_events where provider = 'efi' and " + where)
                .query(Long.class).single();
    }

    private long outboxFor(Long chargeId) {
        return jdbc.sql("select count(*) from outbox_events where type = 'charge.settled' and aggregate_id = :id")
                .param("id", chargeId).query(Long.class).single();
    }

    private Long seedCharge(String document, String idempotencyKey) {
        Long clientId = jdbc.sql("insert into clients (document, document_type, name) values (:d,'CPF','Cliente P08') returning id")
                .param("d", document).query(Long.class).single();
        Long contractId = jdbc.sql("insert into contracts (client_id, title, amount, billing_day) values (:c,'Contrato P08',320.00,10) returning id")
                .param("c", clientId).query(Long.class).single();
        Long invoice = jdbc.sql("insert into invoices (contract_id, amount, due_date, status) values (:k,320.00,date '2026-08-10','OPEN') returning id")
                .param("k", contractId).query(Long.class).single();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Idempotency-Key", idempotencyKey);
        ResponseEntity<ChargeResponse> charge = rest.postForEntity(
                "/charges",
                new HttpEntity<>(new ChargeRequest(invoice, ChargeRail.PIX), headers),
                ChargeResponse.class);
        assertThat(charge.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        invoiceId = invoice;
        txid = charge.getBody().providerRef();
        return charge.getBody().id();
    }

    @Test
    @Order(1)
    void seedFaturaEChargePendente() {
        chargeId = seedCharge("52998224725", "p08-efi-charge");
        assertThat(txid).isNotBlank();
    }

    @Test
    @Order(2)
    void segredoAusenteOuErradoRetorna401ERegistraOCorpo() {
        String body = pixNotification("E-NAO-AUTORIZADO", txid);

        assertThat(postEfi("/webhooks/efi/pix", body).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(postEfi("/webhooks/efi/pix?hmac=segredo-errado", body).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        assertThat(webhookEventsEfi("signature_ok = false")).isEqualTo(2);
        assertThat(outboxFor(chargeId)).isZero();
        assertThat(jdbc.sql("select status from charges where id = :id")
                .param("id", chargeId).query(String.class).single()).isEqualTo("PENDING");
    }

    @Test
    @Order(3)
    void pingDeConfiguracaoRespondeOkSemEfeito() {
        ResponseEntity<JsonNode> response = postEfi("/webhooks/efi?hmac=" + SECRET, "{\"evento\":\"teste_webhook\"}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().path("result").asString()).isEqualTo("ignored");
        assertThat(webhookEventsEfi("signature_ok = true and dedupe_key is null and processed_at is not null"))
                .isEqualTo(1);
        assertThat(outboxFor(chargeId)).isZero();
    }

    @Test
    @Order(4)
    void notificacaoValidaLiquidaAChargeEGravaOOutboxNaMesmaTransacao() {
        ResponseEntity<JsonNode> response = postEfi(
                "/webhooks/efi/pix?hmac=" + SECRET, pixNotification("E09089356202608021203aaa", txid));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().path("result").asString()).isEqualTo("processed");

        ResponseEntity<ChargeResponse> charge = rest.getForEntity("/charges/" + chargeId, ChargeResponse.class);
        assertThat(charge.getBody().status()).isEqualTo(ChargeStatus.SETTLED);
        assertThat(charge.getBody().settledAt()).isNotNull();
        assertThat(outboxFor(chargeId)).isEqualTo(1);

        String e2e = jdbc.sql("select payload->>'e2eId' from outbox_events where aggregate_id = :id")
                .param("id", chargeId).query(String.class).single();
        assertThat(e2e).isEqualTo("E09089356202608021203aaa");

        // I7: a fatura continua OPEN — quem a vira PAID é o worker Go consumindo o outbox
        ResponseEntity<JsonNode> status = rest.getForEntity("/invoices/" + invoiceId + "/status", JsonNode.class);
        assertThat(status.getBody().path("status").asString()).isEqualTo("OPEN");
    }

    @Test
    @Order(5)
    void replayDoMesmoE2eIdRetorna200SemReprocessar() {
        ResponseEntity<JsonNode> response = postEfi(
                "/webhooks/efi/pix?hmac=" + SECRET, pixNotification("E09089356202608021203aaa", txid));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().path("result").asString()).isEqualTo("duplicate");
        assertThat(outboxFor(chargeId)).isEqualTo(1);
    }

    @Test
    @Order(6)
    void loteComVariosPixDeduplicaEventoAEvento() {
        outroChargeId = seedCharge("11144477735", "p08-efi-charge-2");
        outroTxid = txid;

        String lote = """
                {"pix":[
                  {"endToEndId":"E09089356202608021203bbb","txid":"%s","valor":"320.00"},
                  {"endToEndId":"E09089356202608021203ccc","txid":"NAOEXISTE0000000000000000000","valor":"10.00"}
                ]}""".formatted(outroTxid);

        ResponseEntity<JsonNode> response = postEfi("/webhooks/efi/pix?hmac=" + SECRET, lote);

        // PROCESSED tem precedência: o lote liquidou o que dava para liquidar
        assertThat(response.getBody().path("result").asString()).isEqualTo("processed");
        assertThat(outboxFor(outroChargeId)).isEqualTo(1);
        assertThat(webhookEventsEfi("dedupe_key = 'E09089356202608021203bbb'")).isEqualTo(1);
        assertThat(webhookEventsEfi("dedupe_key = 'E09089356202608021203ccc'")).isEqualTo(1);

        // reenvio do MESMO lote: nenhum dos dois eventos vale de novo
        ResponseEntity<JsonNode> replay = postEfi("/webhooks/efi/pix?hmac=" + SECRET, lote);
        assertThat(replay.getBody().path("result").asString()).isEqualTo("duplicate");
        assertThat(outboxFor(outroChargeId)).isEqualTo(1);
        assertThat(webhookEventsEfi("dedupe_key = 'E09089356202608021203bbb'")).isEqualTo(1);
    }

    @Test
    @Order(7)
    void pixSemEndToEndIdRetorna400() {
        ResponseEntity<JsonNode> response = postEfi("/webhooks/efi/pix?hmac=" + SECRET,
                "{\"pix\":[{\"txid\":\"" + txid + "\",\"valor\":\"320.00\"}]}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
