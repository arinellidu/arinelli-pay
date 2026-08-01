package br.com.arinelli.pay.payments.webhooks;

public class InvalidWebhookPayloadException extends RuntimeException {

    public InvalidWebhookPayloadException(String message) {
        super(message);
    }
}
