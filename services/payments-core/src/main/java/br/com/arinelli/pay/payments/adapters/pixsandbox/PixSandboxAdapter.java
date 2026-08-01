package br.com.arinelli.pay.payments.adapters.pixsandbox;

import br.com.arinelli.pay.payments.pix.PixCharge;
import br.com.arinelli.pay.payments.pix.PixChargeRequest;
import br.com.arinelli.pay.payments.pix.PixProvider;
import br.com.arinelli.pay.payments.pix.PixProviderException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Adapter para o pix-sandbox (emulador Go). Timeout 3s via
 * spring.http.clients.* (application.yml); retry só em erro transitório
 * (I/O e 5xx) — 4xx falha direto. Tipos HTTP não saem daqui (I4).
 */
@Component
@ConditionalOnProperty(name = "pix.provider", havingValue = "sandbox")
public class PixSandboxAdapter implements PixProvider {

    private static final Logger log = LoggerFactory.getLogger(PixSandboxAdapter.class);
    private static final int MAX_ATTEMPTS = 3;

    private final RestClient restClient;

    public PixSandboxAdapter(RestClient.Builder builder, @Value("${pix.sandbox-url}") String baseUrl) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    @Override
    public String name() {
        return "pix-sandbox";
    }

    @Override
    public PixCharge createCharge(PixChargeRequest request) {
        CobRequest body = new CobRequest(request.txid(), request.amount().toPlainString(), request.description());
        RuntimeException last = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                CobResponse response = restClient.post()
                        .uri("/cob")
                        .body(body)
                        .retrieve()
                        .body(CobResponse.class);
                if (response == null || response.emv() == null) {
                    throw new PixProviderException("pix-sandbox respondeu sem EMV");
                }
                return new PixCharge(response.txid(), response.emv());
            } catch (ResourceAccessException | HttpServerErrorException e) {
                // transitório: I/O (timeout, conexão) ou 5xx — tenta de novo
                last = e;
                log.warn("pix-sandbox transitório (tentativa {}/{}): {}", attempt, MAX_ATTEMPTS, e.getMessage());
            } catch (RestClientResponseException e) {
                // 4xx e afins: não transitório, sem retry
                throw new PixProviderException("pix-sandbox rejeitou a cobrança: HTTP " + e.getStatusCode().value(), e);
            }
        }
        throw new PixProviderException("pix-sandbox indisponível após " + MAX_ATTEMPTS + " tentativas", last);
    }

    record CobRequest(String txid, String valor, String descricao) {
    }

    record CobResponse(String txid, String emv, String status) {
    }
}
