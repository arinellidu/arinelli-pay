package br.com.arinelli.pay.billing.contracts;

public class ContractNotFoundException extends RuntimeException {

    public ContractNotFoundException(Long id) {
        super("Contrato não encontrado: id=" + id);
    }
}
