package br.com.arinelli.pay.payments.invoices;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Leitura mínima da tabela invoices (dona: billing-core). payments-core não
 * mapeia a entidade — só consulta o que precisa para cobrar (valor e status).
 */
@Component
public class InvoiceReader {

    private final JdbcClient jdbc;

    public InvoiceReader(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public record InvoiceSnapshot(Long id, BigDecimal amount, String status) {
        public boolean chargeable() {
            return "OPEN".equals(status) || "OVERDUE".equals(status);
        }
    }

    public Optional<InvoiceSnapshot> find(Long invoiceId) {
        return jdbc.sql("select id, amount, status from invoices where id = :id")
                .param("id", invoiceId)
                .query((rs, rowNum) -> new InvoiceSnapshot(
                        rs.getLong("id"),
                        rs.getBigDecimal("amount"),
                        rs.getString("status")))
                .optional();
    }
}
