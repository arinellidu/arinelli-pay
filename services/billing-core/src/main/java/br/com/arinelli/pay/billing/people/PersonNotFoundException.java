package br.com.arinelli.pay.billing.people;

public class PersonNotFoundException extends RuntimeException {

    public PersonNotFoundException(String kind, Long id) {
        super(kind + " não encontrada: " + id);
    }
}
