package br.com.arinelli.pay.payments.adapters.efi;

import br.com.arinelli.pay.payments.pix.PixProviderException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

/**
 * OAuth2 client_credentials da Efí. O token vale ~1h e é reaproveitado entre
 * cobranças — pedir um por chamada é desperdício e conta contra o rate limit do PSP.
 * Renova 60s antes do vencimento e é descartável na hora ({@link #invalidate()})
 * quando a API responde 401.
 */
class EfiTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(EfiTokenProvider.class);
    private static final Duration SKEW = Duration.ofSeconds(60);
    private static final int FALLBACK_TTL_SECONDS = 3600;

    private final RestClient client;
    private final String basicAuth;
    private final Clock clock;

    private volatile Token cached;

    EfiTokenProvider(RestClient client, String clientId, String clientSecret, Clock clock) {
        this.client = client;
        this.basicAuth = "Basic " + Base64.getEncoder().encodeToString(
                (clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));
        this.clock = clock;
    }

    /** Valor pronto para o header Authorization. */
    String bearer() {
        Token token = cached;
        if (token != null && token.validAt(clock.instant())) {
            return token.header();
        }
        synchronized (this) {
            Token current = cached;
            if (current != null && current.validAt(clock.instant())) {
                return current.header();
            }
            cached = fetch();
            return cached.header();
        }
    }

    /** 401 na API: o token morreu antes da hora (revogado, reemitido). Próxima chamada reautentica. */
    void invalidate() {
        cached = null;
    }

    private Token fetch() {
        JsonNode body = client.post()
                .uri("/oauth/token")
                .header(HttpHeaders.AUTHORIZATION, basicAuth)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("grant_type", "client_credentials"))
                .retrieve()
                .body(JsonNode.class);

        String accessToken = body == null ? null : body.path("access_token").asString(null);
        if (accessToken == null || accessToken.isBlank()) {
            throw new PixProviderException("Efí devolveu /oauth/token sem access_token");
        }
        int ttl = body.path("expires_in").asInt(FALLBACK_TTL_SECONDS);
        Instant expiresAt = clock.instant().plusSeconds(ttl).minus(SKEW);
        log.debug("token da Efí renovado, expira em {}s (skew de {}s aplicado)", ttl, SKEW.toSeconds());
        return new Token("Bearer " + accessToken, expiresAt);
    }

    private record Token(String header, Instant expiresAt) {

        boolean validAt(Instant now) {
            return now.isBefore(expiresAt);
        }
    }
}
