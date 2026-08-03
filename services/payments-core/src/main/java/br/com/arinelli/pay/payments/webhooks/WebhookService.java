package br.com.arinelli.pay.payments.webhooks;

import br.com.arinelli.pay.payments.charges.Charge;
import br.com.arinelli.pay.payments.charges.ChargeRepository;
import br.com.arinelli.pay.payments.charges.ChargeStatus;
import br.com.arinelli.pay.payments.outbox.OutboxEvent;
import br.com.arinelli.pay.payments.outbox.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Pipeline único de webhook — o mesmo para todo provider (I5, I2, I7). O que varia
 * por PSP (autenticação e formato do payload) fica no {@link WebhookTranslator}.
 */
@Service
public class WebhookService {

    /** Ordem = precedência ao agregar um payload com vários eventos. */
    public enum Result { PROCESSED, UNKNOWN_CHARGE, DUPLICATE, IGNORED }

    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);

    private final Map<String, WebhookTranslator> translators;
    private final WebhookEventRepository webhooks;
    private final ChargeRepository charges;
    private final OutboxEventRepository outbox;
    private final TransactionTemplate tx;
    private final JsonMapper json = JsonMapper.builder().build();

    public WebhookService(Collection<WebhookTranslator> translators, WebhookEventRepository webhooks,
                          ChargeRepository charges, OutboxEventRepository outbox,
                          PlatformTransactionManager txManager) {
        this.translators = translators.stream()
                .collect(Collectors.toUnmodifiableMap(WebhookTranslator::provider, Function.identity()));
        this.webhooks = webhooks;
        this.charges = charges;
        this.outbox = outbox;
        this.tx = new TransactionTemplate(txManager);
    }

    /**
     * I5: autenticação sobre o corpo CRU; payload persistido antes de qualquer efeito.
     * I2: transição da charge e INSERT no outbox na MESMA transação — zero chamada
     * externa aqui dentro.
     */
    public Result process(String provider, byte[] rawBody, WebhookRequest request) {
        WebhookTranslator translator = translators.get(provider);
        if (translator == null) {
            throw new IllegalArgumentException("provider de webhook sem translator: " + provider);
        }
        String raw = new String(rawBody, StandardCharsets.UTF_8);

        if (!translator.authenticate(rawBody, request)) {
            tx.executeWithoutResult(s ->
                    webhooks.save(new WebhookEvent(provider, false, asJsonOrWrapped(raw), null)));
            throw new InvalidWebhookSignatureException();
        }

        List<SettlementEvent> events;
        try {
            events = translator.translate(rawBody);
        } catch (InvalidWebhookPayloadException e) {
            // I5: autenticado mas ilegível também é registrado — descartar sem rastro é como não ter recebido
            tx.executeWithoutResult(s ->
                    webhooks.save(new WebhookEvent(provider, true, asJsonOrWrapped(raw), null)));
            throw e;
        }
        if (events.isEmpty()) {
            // ping de configuração, evento de outro tipo: registra e segue (I5)
            tx.executeWithoutResult(s -> {
                WebhookEvent event = webhooks.save(new WebhookEvent(provider, true, raw, null));
                event.markProcessed(OffsetDateTime.now());
            });
            log.info("webhook sem evento de liquidação provider={}", provider);
            return Result.IGNORED;
        }

        Result aggregate = Result.IGNORED;
        for (SettlementEvent event : events) {
            Result result = handleOne(provider, raw, event);
            if (result.ordinal() < aggregate.ordinal()) {
                aggregate = result;
            }
        }
        return aggregate;
    }

    private Result handleOne(String provider, String raw, SettlementEvent event) {
        try {
            return tx.execute(s -> settle(provider, raw, event));
        } catch (DataIntegrityViolationException e) {
            // uq_webhook_dedupe: replay do mesmo evento — 200 sem reprocessar
            log.info("webhook duplicado ignorado provider={} dedupe={}", provider, event.dedupeKey());
            return Result.DUPLICATE;
        }
    }

    /** Roda inteiro dentro de UMA transação (TransactionTemplate). */
    private Result settle(String provider, String raw, SettlementEvent event) {
        WebhookEvent stored = new WebhookEvent(provider, true, raw, event.dedupeKey());
        webhooks.saveAndFlush(stored); // dedupe decide aqui: violação estoura para o caller

        OffsetDateTime now = OffsetDateTime.now();
        stored.markProcessed(now);

        if (!event.settles()) {
            log.info("evento não liquida nada provider={} dedupe={}", provider, event.dedupeKey());
            return Result.IGNORED;
        }

        Charge charge = event.txid() == null ? null : charges.findByProviderRef(event.txid()).orElse(null);
        if (charge == null) {
            log.warn("webhook para charge desconhecida provider={} txid={} dedupe={}",
                    provider, event.txid(), event.dedupeKey());
            return Result.UNKNOWN_CHARGE;
        }
        if (charge.getStatus() != ChargeStatus.PENDING) {
            log.info("charge {} já em {} — dedupe={} ignorado", charge.getId(), charge.getStatus(), event.dedupeKey());
            return Result.IGNORED;
        }

        charge.markSettled(now);
        outbox.save(new OutboxEvent("charge", charge.getId(), "charge.settled",
                json.writeValueAsString(new ChargeSettled(
                        charge.getId(), charge.getInvoiceId(), event.dedupeKey(), now))));
        log.info("charge {} SETTLED via webhook provider={} e2eId={} (outbox charge.settled gravado)",
                charge.getId(), provider, event.dedupeKey());
        return Result.PROCESSED;
    }

    record ChargeSettled(Long chargeId, Long invoiceId, String e2eId, OffsetDateTime settledAt) {
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
}
