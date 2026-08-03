package br.com.arinelli.pay.payments.webhooks;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * O que veio na requisição além do corpo cru. Cada provider autentica de um jeito:
 * header assinado (nosso Pix de dev, Stripe), segredo na query (Efí sem mTLS reverso),
 * token no path. O corpo CRU nunca passa por aqui — vai separado, byte a byte (I5).
 */
public record WebhookRequest(Map<String, String> headers, Map<String, String> query) {

    public WebhookRequest {
        headers = normalized(headers, true);
        query = normalized(query, false);
    }

    /** Header por nome, sem depender de caixa (HTTP/2 manda tudo minúsculo). */
    public String header(String name) {
        return headers.get(name.toLowerCase(Locale.ROOT));
    }

    public String query(String name) {
        return query.get(name);
    }

    private static Map<String, String> normalized(Map<String, String> source, boolean lowerKeys) {
        if (source == null || source.isEmpty()) {
            return Map.of();
        }
        Map<String, String> copy = new HashMap<>();
        source.forEach((key, value) -> {
            if (key != null && value != null) {
                copy.put(lowerKeys ? key.toLowerCase(Locale.ROOT) : key, value);
            }
        });
        return Map.copyOf(copy);
    }
}
