package br.com.arinelli.pay.payments.adapters.fake;

import br.com.arinelli.pay.payments.pix.PixCharge;
import br.com.arinelli.pay.payments.pix.PixChargeRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class FakePixProviderTest {

    private final FakePixProvider provider = new FakePixProvider();

    @Test
    void emvFixoValido() {
        PixCharge charge = provider.createCharge(
                new PixChargeRequest("ARINPAY00000001AABBCCDDEEFF0011", new BigDecimal("250.00"), "Fatura 1"));

        assertThat(charge.emv()).startsWith("000201");
        assertThat(charge.emv()).contains("BR.GOV.BCB.PIX");
        assertThat(charge.emv()).contains("5303986");             // moeda BRL
        assertThat(charge.emv()).contains("5406250.00");          // valor com escala 2
        assertThat(charge.emv()).contains("ARINPAY00000001AABBCCDDEEFF0011");

        // CRC16/CCITT-FALSE dos últimos 4 chars bate com o corpo (inclui o "6304")
        String body = charge.emv().substring(0, charge.emv().length() - 4);
        String crc = charge.emv().substring(charge.emv().length() - 4);
        assertThat(BrCodeEmv.crc16(body)).isEqualTo(crc);
    }

    @Test
    void providerRefDeterministicoPorTxid() {
        var request = new PixChargeRequest("ARINPAY00000002AABBCCDDEEFF0011", new BigDecimal("10.00"), "x");
        assertThat(provider.createCharge(request).providerRef())
                .isEqualTo("fake-ARINPAY00000002AABBCCDDEEFF0011")
                .isEqualTo(provider.createCharge(request).providerRef());
    }

    @Test
    void crcDeReferencia() {
        // vetor conhecido do CRC16/CCITT-FALSE: "123456789" -> 0x29B1
        assertThat(BrCodeEmv.crc16("123456789")).isEqualTo("29B1");
    }
}
