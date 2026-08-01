package br.com.arinelli.pay.billing.clients;

public class DuplicateDocumentException extends RuntimeException {

    public DuplicateDocumentException(String document) {
        super("Documento já cadastrado: " + document);
    }
}
