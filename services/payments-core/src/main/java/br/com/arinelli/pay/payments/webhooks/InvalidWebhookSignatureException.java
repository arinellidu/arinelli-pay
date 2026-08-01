package br.com.arinelli.pay.payments.webhooks;

public class InvalidWebhookSignatureException extends RuntimeException {

    public InvalidWebhookSignatureException() {
        super("Assinatura HMAC inválida ou ausente");
    }
}
