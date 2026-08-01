package br.com.arinelli.pay.billing.clients;

public class InvalidDocumentException extends RuntimeException {

    public InvalidDocumentException(String document) {
        super("Documento inválido: CPF (11 dígitos) ou CNPJ (14 dígitos) com dígitos verificadores corretos é obrigatório");
    }
}
