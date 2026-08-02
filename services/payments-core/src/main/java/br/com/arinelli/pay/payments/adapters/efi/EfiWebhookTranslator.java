package br.com.arinelli.pay.payments.adapters.efi;

import br.com.arinelli.pay.payments.webhooks.InvalidWebhookPayloadException;
import br.com.arinelli.pay.payments.webhooks.SettlementEvent;
import br.com.arinelli.pay.payments.webhooks.Signatures;
import br.com.arinelli.pay.payments.webhooks.WebhookRequest;
import br.com.arinelli.pay.payments.webhooks.WebhookTranslator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Tradutor do webhook da Efí. Registrado sempre (não depende de PIX_PROVIDER): a URL
 * precisa existir e responder 200 no momento em que se cadastra o webhook na Efí,
 * antes de qualquer cobrança.
 *
 * <p><b>Autenticação (ADR-004):</b> a Efí não assina o corpo. O mecanismo oficial é
 * mTLS reverso — ela apresenta um certificado ao NOSSO endpoint —, o que exige
 * terminação TLS própria e não existe em dev. Com {@code x-skip-mtls-checking}, a
 * própria Efí documenta o segredo na query string como alternativa; é o que usamos,
 * comparado em tempo constante e fail-closed. Em produção com TLS próprio, a
 * validação do certificado do cliente na borda substitui isto.
 *
 * <p>Payload: {@code {"pix":[{"endToEndId","txid","valor","horario"}]}} — a Efí só
 * notifica pix RECEBIDO, então todo item da lista liquida. O ping de configuração
 * ({@code {"evento":"teste_webhook"}}) não traz {@code pix} e vira lista vazia.
 */
@Component
public class EfiWebhookTranslator implements WebhookTranslator {

    private final String secret;
    private final JsonMapper json = JsonMapper.builder().build();

    public EfiWebhookTranslator(@Value("${webhook.efi-secret:}") String secret) {
        this.secret = secret;
    }

    @Override
    public String provider() {
        return "efi";
    }

    @Override
    public boolean authenticate(byte[] rawBody, WebhookRequest request) {
        return Signatures.secretMatches(request.query("hmac"), secret);
    }

    @Override
    public List<SettlementEvent> translate(byte[] rawBody) {
        JsonNode root = parse(new String(rawBody, StandardCharsets.UTF_8));
        JsonNode pix = root.path("pix");
        if (!pix.isArray() || pix.isEmpty()) {
            return List.of();
        }
        List<SettlementEvent> events = new ArrayList<>(pix.size());
        for (JsonNode item : pix) {
            String e2eId = item.path("endToEndId").asString(null);
            if (e2eId == null || e2eId.isBlank()) {
                throw new InvalidWebhookPayloadException("item de pix sem endToEndId");
            }
            events.add(new SettlementEvent(e2eId, item.path("txid").asString(null), true));
        }
        return List.copyOf(events);
    }

    private JsonNode parse(String raw) {
        try {
            return json.readTree(raw);
        } catch (JacksonException e) {
            throw new InvalidWebhookPayloadException("corpo não é JSON válido");
        }
    }
}
