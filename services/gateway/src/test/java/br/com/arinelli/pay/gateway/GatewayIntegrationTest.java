package br.com.arinelli.pay.gateway;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Import(GatewayIntegrationTest.RedisTestConfiguration.class)
class GatewayIntegrationTest {

    @TestConfiguration(proxyBeanMethods = false)
    static class RedisTestConfiguration {

        @Bean
        @ServiceConnection(name = "redis")
        GenericContainer redisContainer() {
            return new GenericContainer("redis:8-alpine").withExposedPorts(6379);
        }
    }

    /** Backend fake: grava o último request recebido por rota e ecoa 200. */
    private static HttpServer backend;
    private static final Map<String, String> lastPath = new ConcurrentHashMap<>();
    private static final Map<String, String> lastRequestId = new ConcurrentHashMap<>();

    @Autowired
    private TestRestTemplate rest;

    @BeforeAll
    static void startBackend() throws Exception {
        backend = HttpServer.create(new InetSocketAddress(0), 0);
        backend.createContext("/", exchange -> {
            lastPath.put("any", exchange.getRequestURI().getPath());
            String rid = exchange.getRequestHeaders().getFirst("X-Request-Id");
            if (rid != null) {
                lastRequestId.put("any", rid);
            }
            byte[] body = "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });
        backend.start();
    }

    @AfterAll
    static void stopBackend() {
        backend.stop(0);
    }

    @DynamicPropertySource
    static void backendUrls(DynamicPropertyRegistry registry) throws Exception {
        // BeforeAll ainda não rodou quando as propriedades são resolvidas: sobe aqui se preciso
        if (backend == null) {
            startBackend();
        }
        String url = "http://localhost:" + backend.getAddress().getPort();
        registry.add("BILLING_CORE_URL", () -> url);
        registry.add("PAYMENTS_CORE_URL", () -> url);
    }

    @Test
    void rotaBillingComStripPrefixERequestIdGerado() {
        ResponseEntity<String> response = rest.getForEntity("/api/billing/clients", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(lastPath.get("any")).isEqualTo("/clients"); // StripPrefix=2
        assertThat(response.getHeaders().getFirst("X-Request-Id")).isNotBlank();
        assertThat(lastRequestId.get("any")).isNotBlank(); // downstream recebeu
    }

    @Test
    void requestIdExistenteEhPropagadoIntacto() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Request-Id", "rid-fixo-123");
        ResponseEntity<String> response = rest.exchange(
                "/api/billing/clients", HttpMethod.GET, new HttpEntity<>(headers), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getFirst("X-Request-Id")).isEqualTo("rid-fixo-123");
        assertThat(lastRequestId.get("any")).isEqualTo("rid-fixo-123");
    }

    @Test
    void mutacaoDeChargesSemIdempotencyKeyMorreNaBordaCom400() {
        ResponseEntity<String> response = rest.postForEntity(
                "/api/payments/charges", Map.of("invoiceId", 1, "rail", "PIX"), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getHeaders().getContentType().toString()).contains("problem+json");
        assertThat(response.getBody()).contains("Idempotency-Key é obrigatório");
        // não chegou no backend: o último path visto não é /charges
        assertThat(lastPath.get("any")).isNotEqualTo("/charges");
    }

    @Test
    void mutacaoComIdempotencyKeyPassaPelaBorda() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Idempotency-Key", "edge-ok-1");
        ResponseEntity<String> response = rest.exchange(
                "/api/payments/charges", HttpMethod.POST,
                new HttpEntity<>(Map.of("invoiceId", 1, "rail", "PIX"), headers), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK); // backend fake ecoa 200
        assertThat(lastPath.get("any")).isEqualTo("/charges");
    }

    @Test
    void rateLimitEstoura429DepoisDoBurst() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Client-Id", "cliente-rl-test");
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        int ok = 0;
        int tooMany = 0;
        for (int i = 0; i < 40; i++) {
            ResponseEntity<String> response = rest.exchange(
                    "/api/billing/clients", HttpMethod.GET, entity, String.class);
            if (response.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                tooMany++;
            } else if (response.getStatusCode().is2xxSuccessful()) {
                ok++;
            }
        }
        // burst 20 / 10 rps: as primeiras passam, o excedente leva 429
        assertThat(ok).isGreaterThanOrEqualTo(15);
        assertThat(tooMany).isGreaterThanOrEqualTo(5);
    }
}
