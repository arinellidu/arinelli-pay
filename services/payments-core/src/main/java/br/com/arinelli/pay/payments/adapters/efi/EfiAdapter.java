package br.com.arinelli.pay.payments.adapters.efi;

import br.com.arinelli.pay.payments.pix.PixCharge;
import br.com.arinelli.pay.payments.pix.PixChargeRequest;
import br.com.arinelli.pay.payments.pix.PixChargeStatus;
import br.com.arinelli.pay.payments.pix.PixProvider;
import br.com.arinelli.pay.payments.pix.PixProviderException;
import br.com.arinelli.pay.payments.pix.PixStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.function.Supplier;

/**
 * Adapter da API Pix da Efí (I4): nada de HTTP, OAuth ou vocabulário da Efí sai
 * deste pacote — o domínio vê só {@link PixProvider} e seus records.
 *
 * <p>Cobrança imediata via {@code PUT /v2/cob/{txid}} (txid nosso, estável por charge,
 * o que torna a criação idempotente também do lado do PSP: repetir o PUT devolve a
 * mesma cobrança em vez de criar outra).
 */
public class EfiAdapter implements PixProvider {

    private static final Logger log = LoggerFactory.getLogger(EfiAdapter.class);
    private static final int MAX_ATTEMPTS = 3;
    private static final long RETRY_BACKOFF_MS = 200;
    private static final int ERROR_BODY_LIMIT = 300;

    private final RestClient client;
    private final EfiTokenProvider tokens;
    private final String pixKey;
    private final int expirationSeconds;

    public EfiAdapter(RestClient client, EfiTokenProvider tokens, String pixKey, int expirationSeconds) {
        this.client = client;
        this.tokens = tokens;
        this.pixKey = pixKey;
        this.expirationSeconds = expirationSeconds;
    }

    @Override
    public String name() {
        return "efi";
    }

    @Override
    public PixCharge createCharge(PixChargeRequest request) {
        BigDecimal amount = request.amount();
        if (amount.scale() > 2) {
            // I3: dinheiro nasce NUMERIC(14,2); arredondar em silêncio na borda do PSP esconderia o bug
            throw new PixProviderException("valor com mais de 2 casas decimais não é cobrável: " + amount);
        }
        CobRequest body = new CobRequest(
                new Calendario(expirationSeconds),
                new Valor(amount.setScale(2, RoundingMode.UNNECESSARY).toPlainString()),
                pixKey,
                request.description());

        Cob cob = execute("criar cobrança", () -> client.put()
                .uri("/v2/cob/{txid}", request.txid())
                .header(HttpHeaders.AUTHORIZATION, tokens.bearer())
                .body(body)
                .retrieve()
                .body(Cob.class));

        if (cob == null || cob.txid() == null) {
            throw new PixProviderException("Efí respondeu a criação de cobrança sem txid");
        }
        String emv = cob.pixCopiaECola() != null && !cob.pixCopiaECola().isBlank()
                ? cob.pixCopiaECola()
                : qrCodeFromLoc(cob.loc());
        log.info("cobrança criada na Efí txid={} status={}", cob.txid(), cob.status());
        return new PixCharge(cob.txid(), emv);
    }

    @Override
    public PixChargeStatus consult(String txid) {
        Cob cob;
        try {
            cob = execute("consultar cobrança", () -> client.get()
                    .uri("/v2/cob/{txid}", txid)
                    .header(HttpHeaders.AUTHORIZATION, tokens.bearer())
                    .retrieve()
                    .body(Cob.class));
        } catch (PixProviderException e) {
            // 404 = a Efí não conhece o txid; para a conciliação isso é resposta, não erro
            if (e.getCause() instanceof HttpClientErrorException.NotFound) {
                return PixChargeStatus.unknown(txid);
            }
            throw e;
        }

        if (cob == null) {
            return PixChargeStatus.unknown(txid);
        }
        PixStatus status = mapStatus(cob.status());
        PixItem settlement = cob.pix() == null || cob.pix().isEmpty() ? null : cob.pix().getFirst();
        return new PixChargeStatus(
                cob.txid() == null ? txid : cob.txid(),
                status,
                settlement == null ? null : settlement.endToEndId(),
                amountOf(settlement, cob.valor()),
                settlement == null ? null : parseInstant(settlement.horario()));
    }

    /**
     * Versões mais novas da API já devolvem o copia-e-cola no corpo da cobrança;
     * quando não vem, o EMV está no location associado.
     */
    private String qrCodeFromLoc(Loc loc) {
        if (loc == null || loc.id() == null) {
            throw new PixProviderException("Efí respondeu sem pixCopiaECola e sem loc.id — não há EMV para o pagador");
        }
        QrCode qrCode = execute("obter o QR da cobrança", () -> client.get()
                .uri("/v2/loc/{id}/qrcode", loc.id())
                .header(HttpHeaders.AUTHORIZATION, tokens.bearer())
                .retrieve()
                .body(QrCode.class));
        if (qrCode == null || qrCode.qrcode() == null || qrCode.qrcode().isBlank()) {
            throw new PixProviderException("Efí respondeu /v2/loc/" + loc.id() + "/qrcode sem EMV");
        }
        return qrCode.qrcode();
    }

    /**
     * Retry só em erro transitório (I/O e 5xx). 401 invalida o token e reautentica na
     * tentativa seguinte; qualquer outro 4xx é erro nosso e falha direto, sem insistir.
     */
    private <T> T execute(String what, Supplier<T> call) {
        RuntimeException last = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return call.get();
            } catch (ResourceAccessException | HttpServerErrorException e) {
                last = e;
                log.warn("Efí transitório ao {} (tentativa {}/{}): {}", what, attempt, MAX_ATTEMPTS, e.getMessage());
                if (attempt < MAX_ATTEMPTS) {
                    backoff(attempt);
                }
            } catch (HttpClientErrorException.Unauthorized e) {
                last = e;
                tokens.invalidate();
                log.warn("Efí devolveu 401 ao {} — reautenticando (tentativa {}/{})", what, attempt, MAX_ATTEMPTS);
            } catch (RestClientResponseException e) {
                throw new PixProviderException("Efí rejeitou " + what + ": HTTP "
                        + e.getStatusCode().value() + " " + shortBody(e), e);
            }
        }
        if (last instanceof HttpClientErrorException.Unauthorized) {
            // 401 persistente não é indisponibilidade: é credencial — mandar o operador para o lugar certo
            throw new PixProviderException("Efí recusou as credenciais ao " + what
                    + " mesmo após reautenticar — verifique EFI_CLIENT_ID/EFI_CLIENT_SECRET no painel", last);
        }
        throw new PixProviderException("Efí indisponível ao " + what + " após " + MAX_ATTEMPTS + " tentativas", last);
    }

    /** Linear resolve nesta escala (200ms, 400ms) — martelar PSP em 5xx sem pausa só piora. */
    private static void backoff(int attempt) {
        try {
            Thread.sleep(RETRY_BACKOFF_MS * attempt);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PixProviderException("interrompido aguardando retry da Efí", e);
        }
    }

    /** O corpo de erro da Efí ({@code {nome, mensagem}}) é o que explica a recusa — vale no log, truncado. */
    private static String shortBody(RestClientResponseException e) {
        String body = e.getResponseBodyAsString();
        if (body == null || body.isBlank()) {
            return "";
        }
        return body.length() <= ERROR_BODY_LIMIT ? body : body.substring(0, ERROR_BODY_LIMIT) + "…";
    }

    private static PixStatus mapStatus(String efiStatus) {
        if (efiStatus == null) {
            return PixStatus.UNKNOWN;
        }
        return switch (efiStatus.toUpperCase(Locale.ROOT)) {
            case "ATIVA" -> PixStatus.ACTIVE;
            case "CONCLUIDA" -> PixStatus.SETTLED;
            case "REMOVIDA_PELO_USUARIO_RECEBEDOR", "REMOVIDA_PELO_PSP" -> PixStatus.REMOVED;
            default -> PixStatus.UNKNOWN;
        };
    }

    /** I3: dinheiro entra no domínio como BigDecimal escala 2, com arredondamento explícito. */
    private static BigDecimal amountOf(PixItem settlement, Valor valor) {
        String raw = settlement != null ? settlement.valor() : valor == null ? null : valor.original();
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return new BigDecimal(raw).setScale(2, RoundingMode.HALF_UP);
    }

    private static OffsetDateTime parseInstant(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value);
        } catch (DateTimeParseException e) {
            log.warn("horário do pix em formato inesperado: {}", value);
            return null;
        }
    }

    // --- corpo da API da Efí: nunca sai deste pacote (I4) ---

    record CobRequest(Calendario calendario, Valor valor, String chave, String solicitacaoPagador) {
    }

    record Calendario(int expiracao) {
    }

    record Valor(String original) {
    }

    record Loc(Long id, String location, String tipoCob) {
    }

    record PixItem(String endToEndId, String txid, String valor, String horario) {
    }

    record Cob(String txid, String status, Valor valor, Loc loc, String pixCopiaECola, List<PixItem> pix) {
    }

    record QrCode(String qrcode, String imagemQrcode, String linkVisualizacao) {
    }
}
