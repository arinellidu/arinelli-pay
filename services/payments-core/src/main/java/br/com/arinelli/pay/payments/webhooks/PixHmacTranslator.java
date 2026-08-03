package br.com.arinelli.pay.payments.webhooks;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Convenção de dev do repo (providers {@code fake} e {@code pix-sandbox}): corpo
 * {@code {e2eId, txid, status}} assinado em HMAC-SHA256 no header {@code X-Signature}.
 * PSP real não assina assim — cada um tem seu translator em {@code adapters/}.
 */
@Component
public class PixHmacTranslator implements WebhookTranslator {

    private final byte[] secret;
    private final JsonMapper json = JsonMapper.builder().build();

    public PixHmacTranslator(@Value("${webhook.hmac-secret}") String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public String provider() {
        return "pix";
    }

    @Override
    public boolean authenticate(byte[] rawBody, WebhookRequest request) {
        return Signatures.hmacSha256Matches(rawBody, request.header("X-Signature"), secret);
    }

    @Override
    public List<SettlementEvent> translate(byte[] rawBody) {
        JsonNode node = parse(new String(rawBody, StandardCharsets.UTF_8));
        String e2eId = node.path("e2eId").asString(null);
        if (e2eId == null || e2eId.isBlank()) {
            throw new InvalidWebhookPayloadException("payload sem e2eId");
        }
        boolean settles = "CONCLUIDA".equalsIgnoreCase(node.path("status").asString(null));
        return List.of(new SettlementEvent(e2eId, node.path("txid").asString(null), settles));
    }

    private JsonNode parse(String raw) {
        try {
            return json.readTree(raw);
        } catch (JacksonException e) {
            throw new InvalidWebhookPayloadException("corpo não é JSON válido");
        }
    }
}
