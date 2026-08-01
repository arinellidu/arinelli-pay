package br.com.arinelli.pay.payments.charges;

import br.com.arinelli.pay.payments.charges.ChargeExceptions.ChargeNotFoundException;
import br.com.arinelli.pay.payments.charges.ChargeExceptions.InvoiceNotChargeableException;
import br.com.arinelli.pay.payments.charges.ChargeExceptions.InvoiceNotFoundException;
import br.com.arinelli.pay.payments.charges.ChargeExceptions.UnsupportedRailException;
import br.com.arinelli.pay.payments.invoices.InvoiceReader;
import br.com.arinelli.pay.payments.invoices.InvoiceReader.InvoiceSnapshot;
import br.com.arinelli.pay.payments.pix.PixChargeRequest;
import br.com.arinelli.pay.payments.pix.PixProvider;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

@Service
public class ChargeService {

    private final ChargeRepository charges;
    private final InvoiceReader invoiceReader;
    private final PixProvider pixProvider;
    private final TransactionTemplate tx;
    private final JsonMapper json = JsonMapper.builder().build();

    public ChargeService(ChargeRepository charges, InvoiceReader invoiceReader, PixProvider pixProvider,
                         org.springframework.transaction.PlatformTransactionManager txManager) {
        this.charges = charges;
        this.invoiceReader = invoiceReader;
        this.pixProvider = pixProvider;
        this.tx = new TransactionTemplate(txManager);
    }

    public record CreateResult(Charge charge, boolean created) {
    }

    /**
     * I1: idempotência total. Replay da mesma key devolve a charge original.
     * Corrida entre threads é resolvida pelo uq_charges_idem — quem perde o
     * insert carrega a charge vencedora.
     *
     * A chamada ao provider fica FORA de transação (efeito externo síncrono do
     * P03; liquidação assíncrona chega via webhook + outbox no P04).
     */
    public CreateResult create(String idempotencyKey, ChargeRequest request) {
        if (request.rail() != ChargeRail.PIX) {
            throw new UnsupportedRailException(request.rail());
        }
        var existing = charges.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            return new CreateResult(existing.get(), false);
        }

        InvoiceSnapshot invoice = invoiceReader.find(request.invoiceId())
                .orElseThrow(() -> new InvoiceNotFoundException(request.invoiceId()));
        if (!invoice.chargeable()) {
            throw new InvoiceNotChargeableException(invoice.id(), invoice.status());
        }

        Charge charge;
        try {
            charge = tx.execute(status ->
                    charges.saveAndFlush(new Charge(invoice.id(), ChargeRail.PIX, pixProvider.name(), idempotencyKey)));
        } catch (DataIntegrityViolationException e) {
            // corrida no uq_charges_idem: devolve a charge que venceu o insert
            Charge winner = charges.findByIdempotencyKey(idempotencyKey)
                    .orElseThrow(() -> e);
            return new CreateResult(winner, false);
        }

        var pix = pixProvider.createCharge(new PixChargeRequest(
                txid(charge.getId(), idempotencyKey),
                invoice.amount(),
                "Fatura " + invoice.id() + " — Arinelli Pay"));

        String payload = json.writeValueAsString(new PixPayload(pix.emv(), pix.providerRef()));
        tx.executeWithoutResult(status -> {
            Charge managed = charges.findById(charge.getId()).orElseThrow();
            managed.markPending(pix.providerRef(), payload);
        });
        return new CreateResult(charges.findById(charge.getId()).orElseThrow(), true);
    }

    public Charge get(Long id) {
        return charges.findById(id).orElseThrow(() -> new ChargeNotFoundException(id));
    }

    public List<Charge> byInvoice(Long invoiceId) {
        return charges.findByInvoiceIdOrderById(invoiceId);
    }

    public ChargeResponse toResponse(Charge charge) {
        String emv = null;
        if (charge.getPayload() != null) {
            emv = json.readTree(charge.getPayload()).path("emv").asString(null);
        }
        return new ChargeResponse(
                charge.getId(),
                charge.getInvoiceId(),
                charge.getRail(),
                charge.getProvider(),
                charge.getProviderRef(),
                charge.getStatus(),
                emv,
                charge.getCreatedAt(),
                charge.getSettledAt());
    }

    record PixPayload(String emv, String providerRef) {
    }

    /** txid alfanumérico estável por charge (26–35 chars, padrão cob Pix). */
    private static String txid(Long chargeId, String idempotencyKey) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(idempotencyKey.getBytes(StandardCharsets.UTF_8));
            return "ARINPAY%08d".formatted(chargeId) + HexFormat.of().formatHex(hash, 0, 8).toUpperCase();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
