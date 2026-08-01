package br.com.arinelli.pay.payments.pix;

public class PixProviderException extends RuntimeException {

    public PixProviderException(String message, Throwable cause) {
        super(message, cause);
    }

    public PixProviderException(String message) {
        super(message);
    }
}
