package br.com.arinelli.pay.billing.invoices;

import java.time.LocalDate;

/**
 * Regra de vencimento da próxima fatura (P02):
 * due_date cai no próximo billing_day — se o dia já passou no mês corrente, vai
 * para o mês seguinte; se já existe fatura nesse dia ou depois, avança um mês a
 * partir da última (geração explícita em sequência, sem scheduler).
 * billing_day é 1..28 por CHECK do schema, então nunca há clamp de fim de mês.
 */
public final class DueDateRule {

    private DueDateRule() {
    }

    public static LocalDate nextDueDate(LocalDate today, int billingDay, LocalDate latestExistingDue) {
        LocalDate candidate = today.withDayOfMonth(billingDay);
        if (candidate.isBefore(today)) {
            candidate = candidate.plusMonths(1);
        }
        if (latestExistingDue != null && !latestExistingDue.isBefore(candidate)) {
            candidate = latestExistingDue.plusMonths(1).withDayOfMonth(billingDay);
        }
        return candidate;
    }
}
