package br.com.arinelli.pay.payments.charges;

public final class ChargeExceptions {

    private ChargeExceptions() {
    }

    public static class ChargeNotFoundException extends RuntimeException {
        public ChargeNotFoundException(Long id) {
            super("Charge não encontrada: id=" + id);
        }
    }

    public static class InvoiceNotFoundException extends RuntimeException {
        public InvoiceNotFoundException(Long invoiceId) {
            super("Fatura não encontrada: id=" + invoiceId);
        }
    }

    public static class InvoiceNotChargeableException extends RuntimeException {
        public InvoiceNotChargeableException(Long invoiceId, String status) {
            super("Fatura " + invoiceId + " não é cobrável no status " + status);
        }
    }

    public static class UnsupportedRailException extends RuntimeException {
        public UnsupportedRailException(ChargeRail rail) {
            super("Trilho ainda não suportado: " + rail + " (P03 cobre só PIX)");
        }
    }
}
