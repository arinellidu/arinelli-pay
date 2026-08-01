package br.com.arinelli.pay.payments.invoices;

import br.com.arinelli.pay.payments.charges.Charge;
import br.com.arinelli.pay.payments.charges.ChargeExceptions.InvoiceNotFoundException;
import br.com.arinelli.pay.payments.charges.ChargeRepository;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

/** Polling curto da UI (P07): estado consolidado fatura + última charge. */
@RestController
class InvoiceStatusController {

    record ChargeInfo(String rail, String status) {
    }

    record InvoiceStatusResponse(Long invoiceId, String status, OffsetDateTime paidAt, ChargeInfo charge) {
    }

    private final JdbcClient jdbc;
    private final ChargeRepository charges;

    InvoiceStatusController(JdbcClient jdbc, ChargeRepository charges) {
        this.jdbc = jdbc;
        this.charges = charges;
    }

    @GetMapping("/invoices/{id}/status")
    InvoiceStatusResponse status(@PathVariable Long id) {
        var invoice = jdbc.sql("select status, paid_at from invoices where id = :id")
                .param("id", id)
                .query((rs, n) -> new Object[]{rs.getString("status"), rs.getObject("paid_at", OffsetDateTime.class)})
                .optional()
                .orElseThrow(() -> new InvoiceNotFoundException(id));

        List<Charge> chargeList = charges.findByInvoiceIdOrderById(id);
        Charge latest = chargeList.isEmpty() ? null : chargeList.getLast();
        ChargeInfo info = latest == null ? null
                : new ChargeInfo(latest.getRail().name(), latest.getStatus().name());

        return new InvoiceStatusResponse(id, (String) invoice[0], (OffsetDateTime) invoice[1], info);
    }
}
