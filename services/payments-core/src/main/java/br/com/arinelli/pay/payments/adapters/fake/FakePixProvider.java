package br.com.arinelli.pay.payments.adapters.fake;

import br.com.arinelli.pay.payments.pix.PixCharge;
import br.com.arinelli.pay.payments.pix.PixChargeRequest;
import br.com.arinelli.pay.payments.pix.PixProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Provider in-memory para dev/teste: EMV fixo (chave e lojista constantes) e válido (CRC16 real). */
@Component
@ConditionalOnProperty(name = "pix.provider", havingValue = "fake", matchIfMissing = true)
public class FakePixProvider implements PixProvider {

    static final String PIX_KEY = "pagamentos@arinelli.dev";
    static final String MERCHANT = "ARINELLI PAY";
    static final String CITY = "SAO PAULO";

    @Override
    public String name() {
        return "fake";
    }

    @Override
    public PixCharge createCharge(PixChargeRequest request) {
        String emv = BrCodeEmv.payload(PIX_KEY, request.amount(), MERCHANT, CITY, request.txid());
        return new PixCharge("fake-" + request.txid(), emv);
    }
}
