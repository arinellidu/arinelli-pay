package br.com.arinelli.pay.billing.clients;

public class ClientNotFoundException extends RuntimeException {

    public ClientNotFoundException(Long id) {
        super("Cliente não encontrado: id=" + id);
    }
}
