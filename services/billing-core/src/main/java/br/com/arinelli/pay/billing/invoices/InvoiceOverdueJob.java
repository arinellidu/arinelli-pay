package br.com.arinelli.pay.billing.invoices;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/** Job diário (P02): OPEN vencida → OVERDUE. Transição interna, sem efeito externo (I2 não se aplica). */
@Component
public class InvoiceOverdueJob {

    private static final Logger log = LoggerFactory.getLogger(InvoiceOverdueJob.class);

    private final InvoiceService service;

    public InvoiceOverdueJob(InvoiceService service) {
        this.service = service;
    }

    @Scheduled(cron = "${billing.overdue-cron:0 5 0 * * *}")
    public void run() {
        int changed = service.markOverdue(LocalDate.now());
        if (changed > 0) {
            log.info("faturas marcadas como OVERDUE: {}", changed);
        }
    }
}
