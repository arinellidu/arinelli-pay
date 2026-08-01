package br.com.arinelli.pay.payments.adapters.pixsandbox;

import br.com.arinelli.pay.payments.pix.PixCharge;
import br.com.arinelli.pay.payments.pix.PixChargeRequest;
import br.com.arinelli.pay.payments.pix.PixProviderException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.POST;

class PixSandboxAdapterTest {

    private static final String OK_BODY = """
            {"txid":"TX1","emv":"000201...6304ABCD","status":"ATIVA"}
            """;

    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final PixSandboxAdapter adapter = new PixSandboxAdapter(builder, "http://pix-sandbox.test");

    private PixCharge call() {
        return adapter.createCharge(
                new PixChargeRequest("TX1", new BigDecimal("99.90"), "Fatura 9"));
    }

    @Test
    void sucessoNaPrimeiraTentativa() {
        server.expect(requestTo("http://pix-sandbox.test/cob"))
                .andExpect(method(POST))
                .andExpect(jsonPath("$.txid").value("TX1"))
                .andExpect(jsonPath("$.valor").value("99.90"))
                .andRespond(withSuccess(OK_BODY, MediaType.APPLICATION_JSON));

        PixCharge charge = call();

        assertThat(charge.providerRef()).isEqualTo("TX1");
        assertThat(charge.emv()).startsWith("000201");
        server.verify();
    }

    @Test
    void erroTransitorio5xxFazRetryEDepoisSucede() {
        server.expect(requestTo("http://pix-sandbox.test/cob")).andRespond(withServerError());
        server.expect(requestTo("http://pix-sandbox.test/cob")).andRespond(withServerError());
        server.expect(requestTo("http://pix-sandbox.test/cob"))
                .andRespond(withSuccess(OK_BODY, MediaType.APPLICATION_JSON));

        assertThat(call().providerRef()).isEqualTo("TX1");
        server.verify(); // exatamente 3 chamadas: 2 falhas transitórias + 1 sucesso
    }

    @Test
    void erro4xxNaoTemRetry() {
        server.expect(requestTo("http://pix-sandbox.test/cob"))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY));

        assertThatThrownBy(this::call)
                .isInstanceOf(PixProviderException.class)
                .hasMessageContaining("422");
        server.verify(); // uma única chamada
    }

    @Test
    void esgotarRetriesFalhaComProviderException() {
        server.expect(requestTo("http://pix-sandbox.test/cob")).andRespond(withServerError());
        server.expect(requestTo("http://pix-sandbox.test/cob")).andRespond(withServerError());
        server.expect(requestTo("http://pix-sandbox.test/cob")).andRespond(withServerError());

        assertThatThrownBy(this::call)
                .isInstanceOf(PixProviderException.class)
                .hasMessageContaining("indisponível");
        server.verify();
    }
}
