package br.com.arinelli.pay.payments.webhooks;

import br.com.arinelli.pay.payments.charges.Charge;
import br.com.arinelli.pay.payments.charges.ChargeRepository;
import br.com.arinelli.pay.payments.charges.ChargeStatus;
import br.com.arinelli.pay.payments.outbox.OutboxEvent;
import br.com.arinelli.pay.payments.outbox.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.Map;

@Service
public class WebhookService {

    public enum Result { PROCESSED, DUPLICATE, IGNORED, UNKNOWN_CHARGE }

    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);
    private static final String PROVIDER = "pix";

    private final WebhookEventRepository webhooks;
    private final ChargeRepository charges;
    private final OutboxEventRepository outbox;
    private final TransactionTemplate tx;
    private final byte[] secret;
    private final JsonMapper json = JsonMapper.builder().build();

    public WebhookService(WebhookEventRepository webhooks, ChargeRepository charges,
                          OutboxEventRepository outbox, PlatformTransactionManager txManager,
                          @Value("${webhook.hmac-secret}") String secret) {
        this.webhooks = webhooks;
        this.charges = charges;
        this.outbox = outbox;
        this.tx = new TransactionTemplate(txManager);
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    /**
     * I5: assinatura HMAC-SHA256 validada sobre o corpo CRU; o payload é
     * persistido antes de qualquer efeito. I2: transição da charge e INSERT no
     * outbox acontecem na MESMA transação — zero chamada externa aqui dentro.
     */
    public Result process(byte[] rawBody, String signatureHeader) {
        String raw = new String(rawBody, StandardCharsets.UTF_8);

        if (!signatureValid(rawBody, signatureHeader)) {
            tx.executeWithoutResult(s ->
                    webhooks.save(new WebhookEvent(PROVIDER, false, asJsonOrWrapped(raw), null)));
            throw new InvalidWebhookSignatureException();
        }

        JsonNode node = parse(raw);
        String e2eId = node.path("e2eId").asString(null);
        String txid = node.path("txid").asString(null);
        String status = node.path("status").asString(null);
        if (e2eId == null || e2eId.isBlank()) {
            throw new InvalidWebhookPayloadException("payload sem e2eId");
        }

        try {
            return tx.execute(s -> handleVerified(raw, e2eId, txid, status));
        } catch (DataIntegrityViolationException e) {
            // uq_webhook_dedupe: replay do mesmo e2eId — 200 sem reprocessar
            log.info("webhook duplicado ignorado provider={} e2eId={}", PROVIDER, e2eId);
            return Result.DUPLICATE;
        }
    }

    /** Roda inteiro dentro de UMA transação (TransactionTemplate). */
    private Result handleVerified(String raw, String e2eId, String txid, String status) {
        WebhookEvent event = new WebhookEvent(PROVIDER, true, raw, e2eId);
        webhooks.saveAndFlush(event); // dedupe decide aqui: violação estoura para o caller

        OffsetDateTime now = OffsetDateTime.now();
        event.markProcessed(now);

        if (!"CONCLUIDA".equalsIgnoreCase(status)) {
            log.info("webhook status={} não liquida nada e2eId={}", status, e2eId);
            return Result.IGNORED;
        }

        Charge charge = txid == null ? null : charges.findByProviderRef(txid).orElse(null);
        if (charge == null) {
            log.warn("webhook para charge desconhecida txid={} e2eId={}", txid, e2eId);
            return Result.UNKNOWN_CHARGE;
        }
        if (charge.getStatus() != ChargeStatus.PENDING) {
            log.info("charge {} já em {} — e2eId={} ignorado", charge.getId(), charge.getStatus(), e2eId);
            return Result.IGNORED;
        }

        charge.markSettled(now);
        outbox.save(new OutboxEvent("charge", charge.getId(), "charge.settled",
                json.writeValueAsString(new ChargeSettled(charge.getId(), charge.getInvoiceId(), e2eId, now))));
        log.info("charge {} SETTLED via webhook e2eId={} (outbox charge.settled gravado)", charge.getId(), e2eId);
        return Result.PROCESSED;
    }

    record ChargeSettled(Long chargeId, Long invoiceId, String e2eId, OffsetDateTime settledAt) {
    }

    private JsonNode parse(String raw) {
        try {
            return json.readTree(raw);
        } catch (JacksonException e) {
            throw new InvalidWebhookPayloadException("corpo não é JSON válido");
        }
    }

    /** raw_body é JSONB NOT NULL: corpo ilegível entra embrulhado, mas entra (I5). */
    private String asJsonOrWrapped(String raw) {
        try {
            json.readTree(raw);
            return raw;
        } catch (JacksonException e) {
            return json.writeValueAsString(Map.of("_unparsed", raw));
        }
    }

    private boolean signatureValid(byte[] rawBody, String signatureHeader) {
        if (signatureHeader == null || signatureHeader.isBlank()) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            byte[] expected = mac.doFinal(rawBody);
            byte[] provided = HexFormat.of().parseHex(signatureHeader.trim().toLowerCase());
            return MessageDigest.isEqual(expected, provided);
        } catch (NoSuchAlgorithmException | InvalidKeyException | IllegalArgumentException e) {
            return false;
        }
    }
}
