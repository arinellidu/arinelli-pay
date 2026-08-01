package br.com.arinelli.pay.billing.contracts;

public class ContractEndedException extends RuntimeException {

    public ContractEndedException(Long id) {
        super("Contrato encerrado não gera faturas: id=" + id);
    }
}
