package br.com.arinelli.pay.payments.adapters.efi;

import br.com.arinelli.pay.payments.pix.PixCharge;
import br.com.arinelli.pay.payments.pix.PixChargeRequest;
import br.com.arinelli.pay.payments.pix.PixChargeStatus;
import br.com.arinelli.pay.payments.pix.PixProviderException;
import br.com.arinelli.pay.payments.pix.PixStatus;
import com.github.tomakehurst.wiremock.WireMockServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Base64;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.equalToJson;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.put;
import static com.github.tomakehurst.wiremock.client.WireMock.putRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static com.github.tomakehurst.wiremock.stubbing.Scenario.STARTED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * O sandbox da Efí exige credenciais e certificado; sem elas, o contrato do adapter
 * é verificado contra um servidor HTTP real (WireMock) que responde como a Efí.
 * O que NÃO é coberto aqui: o handshake mTLS — ver docs/providers/EFI.md.
 */
class EfiAdapterTest {

    private static final String TXID = "ARINPAY00000042ABCDEF0123456789";
    private static final String COB_URL = "/v2/cob/" + TXID;
    private static final String PIX_KEY = "pagamentos@arinelli.dev";

    private static final String COB_ATIVA = """
            {
              "txid": "%s",
              "revisao": 0,
              "status": "ATIVA",
              "calendario": {"criacao": "2026-08-02T12:00:00.000Z", "expiracao": 3600},
              "valor": {"original": "320.00"},
              "chave": "%s",
              "loc": {"id": 789, "location": "pix-h.api.efipay.com.br/v2/abc", "tipoCob": "cob"},
              "pixCopiaECola": "00020101021226880014BR.GOV.BCB.PIX-EFI"
            }
            """.formatted(TXID, PIX_KEY);

    private static final String COB_SEM_COPIA_E_COLA = """
            {
              "txid": "%s",
              "status": "ATIVA",
              "valor": {"original": "320.00"},
              "loc": {"id": 789, "location": "pix-h.api.efipay.com.br/v2/abc", "tipoCob": "cob"}
            }
            """.formatted(TXID);

    private static final String QRCODE = """
            {"qrcode": "00020101021226880014BR.GOV.BCB.PIX-DA-LOC", "imagemQrcode": "data:image/png;base64,AAA"}
            """;

    private static final String COB_CONCLUIDA = """
            {
              "txid": "%s",
              "status": "CONCLUIDA",
              "valor": {"original": "320.00"},
              "pix": [{
                "endToEndId": "E09089356202608021203abcdef01",
                "txid": "%s",
                "valor": "320.00",
                "horario": "2026-08-02T12:03:41.000Z"
              }]
            }
            """.formatted(TXID, TXID);

    private static WireMockServer efi;

    private MutableClock clock;
    private EfiAdapter adapter;

    @BeforeAll
    static void startServer() {
        efi = new WireMockServer(options().dynamicPort());
        efi.start();
    }

    @AfterAll
    static void stopServer() {
        efi.stop();
    }

    @BeforeEach
    void resetAdapter() {
        efi.resetAll();
        clock = new MutableClock();
        // mesmo transporte da EfiClientConfiguration (menos o mTLS): HTTP/1.1 explícito
        RestClient client = RestClient.builder()
                .baseUrl(efi.baseUrl())
                .requestFactory(new JdkClientHttpRequestFactory(
                        HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build()))
                .build();
        adapter = new EfiAdapter(client, new EfiTokenProvider(client, "client-id", "client-secret", clock),
                PIX_KEY, 3600);
    }

    private PixCharge criar() {
        return adapter.createCharge(new PixChargeRequest(TXID, new BigDecimal("320.00"), "Fatura 42 — Arinelli Pay"));
    }

    private void stubToken(String token) {
        efi.stubFor(post(urlEqualTo("/oauth/token"))
                .willReturn(okJson("{\"access_token\":\"%s\",\"token_type\":\"Bearer\",\"expires_in\":3600}"
                        .formatted(token))));
    }

    @Test
    void autenticaComBasicEcriaCobrancaComOTxidDaCharge() {
        stubToken("TOK-1");
        efi.stubFor(put(urlEqualTo(COB_URL)).willReturn(okJson(COB_ATIVA)));

        PixCharge charge = criar();

        assertThat(charge.providerRef()).isEqualTo(TXID);
        assertThat(charge.emv()).isEqualTo("00020101021226880014BR.GOV.BCB.PIX-EFI");

        String basic = "Basic " + Base64.getEncoder()
                .encodeToString("client-id:client-secret".getBytes(StandardCharsets.UTF_8));
        efi.verify(postRequestedFor(urlEqualTo("/oauth/token"))
                .withHeader("Authorization", equalTo(basic))
                .withRequestBody(equalToJson("{\"grant_type\":\"client_credentials\"}")));
        efi.verify(putRequestedFor(urlEqualTo(COB_URL))
                .withHeader("Authorization", equalTo("Bearer TOK-1"))
                .withRequestBody(equalToJson("""
                        {
                          "calendario": {"expiracao": 3600},
                          "valor": {"original": "320.00"},
                          "chave": "%s",
                          "solicitacaoPagador": "Fatura 42 — Arinelli Pay"
                        }
                        """.formatted(PIX_KEY))));
    }

    @Test
    void reaproveitaOTokenEntreCobrancas() {
        stubToken("TOK-1");
        efi.stubFor(put(urlEqualTo(COB_URL)).willReturn(okJson(COB_ATIVA)));

        criar();
        criar();
        criar();

        efi.verify(1, postRequestedFor(urlEqualTo("/oauth/token")));
        efi.verify(3, putRequestedFor(urlEqualTo(COB_URL)));
    }

    @Test
    void renovaOTokenQuandoAJanelaExpira() {
        stubToken("TOK-1");
        efi.stubFor(put(urlEqualTo(COB_URL)).willReturn(okJson(COB_ATIVA)));

        criar();
        clock.advance(Duration.ofMinutes(58)); // janela útil = 3600s - 60s de skew: ainda vale
        criar();
        efi.verify(1, postRequestedFor(urlEqualTo("/oauth/token")));

        clock.advance(Duration.ofMinutes(2)); // 60min: dentro do expires_in, mas já no skew — renova antes de falhar
        criar();
        efi.verify(2, postRequestedFor(urlEqualTo("/oauth/token")));
    }

    @Test
    void resposta401InvalidaOTokenEReautenticaUmaVez() {
        efi.stubFor(post(urlEqualTo("/oauth/token")).inScenario("token")
                .whenScenarioStateIs(STARTED)
                .willReturn(okJson("{\"access_token\":\"TOK-VELHO\",\"expires_in\":3600}"))
                .willSetStateTo("renovado"));
        efi.stubFor(post(urlEqualTo("/oauth/token")).inScenario("token")
                .whenScenarioStateIs("renovado")
                .willReturn(okJson("{\"access_token\":\"TOK-NOVO\",\"expires_in\":3600}")));

        efi.stubFor(put(urlEqualTo(COB_URL)).inScenario("cob")
                .whenScenarioStateIs(STARTED)
                .willReturn(aResponse().withStatus(401))
                .willSetStateTo("autorizado"));
        efi.stubFor(put(urlEqualTo(COB_URL)).inScenario("cob")
                .whenScenarioStateIs("autorizado")
                .willReturn(okJson(COB_ATIVA)));

        assertThat(criar().providerRef()).isEqualTo(TXID);

        efi.verify(2, postRequestedFor(urlEqualTo("/oauth/token")));
        efi.verify(putRequestedFor(urlEqualTo(COB_URL)).withHeader("Authorization", equalTo("Bearer TOK-VELHO")));
        efi.verify(putRequestedFor(urlEqualTo(COB_URL)).withHeader("Authorization", equalTo("Bearer TOK-NOVO")));
    }

    @Test
    void semCopiaEColaBuscaOEmvNoLocation() {
        stubToken("TOK-1");
        efi.stubFor(put(urlEqualTo(COB_URL)).willReturn(okJson(COB_SEM_COPIA_E_COLA)));
        efi.stubFor(get(urlEqualTo("/v2/loc/789/qrcode")).willReturn(okJson(QRCODE)));

        assertThat(criar().emv()).isEqualTo("00020101021226880014BR.GOV.BCB.PIX-DA-LOC");
        efi.verify(getRequestedFor(urlEqualTo("/v2/loc/789/qrcode"))
                .withHeader("Authorization", equalTo("Bearer TOK-1")));
    }

    @Test
    void erroTransitorio5xxFazRetryEDepoisSucede() {
        stubToken("TOK-1");
        efi.stubFor(put(urlEqualTo(COB_URL)).inScenario("cob")
                .whenScenarioStateIs(STARTED)
                .willReturn(aResponse().withStatus(502))
                .willSetStateTo("segunda"));
        efi.stubFor(put(urlEqualTo(COB_URL)).inScenario("cob")
                .whenScenarioStateIs("segunda")
                .willReturn(aResponse().withStatus(503))
                .willSetStateTo("terceira"));
        efi.stubFor(put(urlEqualTo(COB_URL)).inScenario("cob")
                .whenScenarioStateIs("terceira")
                .willReturn(okJson(COB_ATIVA)));

        assertThat(criar().providerRef()).isEqualTo(TXID);
        efi.verify(3, putRequestedFor(urlEqualTo(COB_URL)));
    }

    @Test
    void erro4xxDeNegocioFalhaSemRetryEPreservaAMensagemDaEfi() {
        stubToken("TOK-1");
        efi.stubFor(put(urlEqualTo(COB_URL)).willReturn(aResponse().withStatus(400)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"nome\":\"chave_invalida\",\"mensagem\":\"A chave informada não pertence à conta\"}")));

        assertThatThrownBy(this::criar)
                .isInstanceOf(PixProviderException.class)
                .hasMessageContaining("400")
                .hasMessageContaining("chave_invalida");
        efi.verify(1, putRequestedFor(urlEqualTo(COB_URL)));
    }

    @Test
    void esgotarRetriesFalhaComProviderException() {
        stubToken("TOK-1");
        efi.stubFor(put(urlEqualTo(COB_URL)).willReturn(aResponse().withStatus(500)));

        assertThatThrownBy(this::criar)
                .isInstanceOf(PixProviderException.class)
                .hasMessageContaining("indisponível");
        efi.verify(3, putRequestedFor(urlEqualTo(COB_URL)));
    }

    @Test
    void consultaTraduzConcluidaParaSettledComE2eIdEValor() {
        stubToken("TOK-1");
        efi.stubFor(get(urlEqualTo(COB_URL)).willReturn(okJson(COB_CONCLUIDA)));

        PixChargeStatus status = adapter.consult(TXID);

        assertThat(status.status()).isEqualTo(PixStatus.SETTLED);
        assertThat(status.e2eId()).isEqualTo("E09089356202608021203abcdef01");
        assertThat(status.amount()).isEqualByComparingTo("320.00");
        assertThat(status.amount().scale()).isEqualTo(2);
        assertThat(status.paidAt()).isEqualTo(OffsetDateTime.parse("2026-08-02T12:03:41Z"));
    }

    @Test
    void consultaTraduzAtivaERemovidaSemInventarLiquidacao() {
        stubToken("TOK-1");
        efi.stubFor(get(urlEqualTo(COB_URL)).willReturn(okJson(COB_ATIVA)));
        PixChargeStatus ativa = adapter.consult(TXID);
        assertThat(ativa.status()).isEqualTo(PixStatus.ACTIVE);
        assertThat(ativa.e2eId()).isNull();
        assertThat(ativa.paidAt()).isNull();

        efi.stubFor(get(urlEqualTo(COB_URL)).willReturn(okJson(
                "{\"txid\":\"%s\",\"status\":\"REMOVIDA_PELO_PSP\"}".formatted(TXID))));
        assertThat(adapter.consult(TXID).status()).isEqualTo(PixStatus.REMOVED);

        efi.stubFor(get(urlEqualTo(COB_URL)).willReturn(okJson(
                "{\"txid\":\"%s\",\"status\":\"ALGO_NOVO\"}".formatted(TXID))));
        assertThat(adapter.consult(TXID).status()).isEqualTo(PixStatus.UNKNOWN);
    }

    /** Relógio controlado: expiração de token é regra de negócio, não corrida com o wall clock. */
    private static final class MutableClock extends Clock {

        private Instant now = Instant.parse("2026-08-02T12:00:00Z");

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }

        void advance(Duration amount) {
            now = now.plus(amount);
        }
    }
}
