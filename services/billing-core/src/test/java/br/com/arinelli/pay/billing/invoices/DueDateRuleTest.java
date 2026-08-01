package br.com.arinelli.pay.billing.invoices;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** Bordas da regra de vencimento: dia 28, virada de mês e virada de ano (P02). */
class DueDateRuleTest {

    @ParameterizedTest(name = "hoje={0} dia={1} -> {2}")
    @CsvSource({
            // dia ainda não passou no mês corrente
            "2026-08-01, 28, 2026-08-28",
            "2026-08-27, 28, 2026-08-28",
            "2026-02-27, 28, 2026-02-28",   // fevereiro, dia 28 existe (billing_day <= 28)
            "2026-08-01,  1, 2026-08-01",   // hoje É o billing_day: vence hoje, não passou
            "2026-08-28, 28, 2026-08-28",
            // dia já passou: mês seguinte
            "2026-08-29, 28, 2026-09-28",
            "2026-08-02,  1, 2026-09-01",   // virada de mês
            "2026-01-31, 28, 2026-02-28",   // jan -> fev
            // virada de ano
            "2026-12-29, 28, 2027-01-28",
            "2026-12-02,  1, 2027-01-01"
    })
    void semFaturaAnterior(LocalDate today, int billingDay, LocalDate expected) {
        assertThat(DueDateRule.nextDueDate(today, billingDay, null)).isEqualTo(expected);
    }

    @ParameterizedTest(name = "hoje={0} dia={1} ultima={2} -> {3}")
    @CsvSource({
            // última fatura já ocupa o candidato: avança um mês a partir dela
            "2026-08-01, 28, 2026-08-28, 2026-09-28",
            "2026-08-29, 28, 2026-09-28, 2026-10-28",
            // sequência atravessando a virada de ano
            "2026-11-30, 28, 2026-12-28, 2027-01-28",
            "2026-12-29, 28, 2027-01-28, 2027-02-28",
            // última fatura antiga (antes do candidato) não interfere
            "2026-08-01, 28, 2026-07-28, 2026-08-28",
            "2026-08-01,  5, 2026-01-05, 2026-08-05"
    })
    void comFaturaAnterior(LocalDate today, int billingDay, LocalDate latest, LocalDate expected) {
        assertThat(DueDateRule.nextDueDate(today, billingDay, latest)).isEqualTo(expected);
    }

    @Test
    void sequenciaLongaMantemODia() {
        LocalDate today = LocalDate.parse("2026-01-10");
        LocalDate due = DueDateRule.nextDueDate(today, 28, null);
        assertThat(due).isEqualTo("2026-01-28");
        for (int i = 0; i < 14; i++) {
            due = DueDateRule.nextDueDate(today, 28, due);
        }
        // 14 gerações depois: 14 meses à frente, sempre dia 28 (passou por fev/2026 e fev/2027)
        assertThat(due).isEqualTo("2027-03-28");
        assertThat(due.getDayOfMonth()).isEqualTo(28);
    }
}
