package br.com.arinelli.pay.billing.people;

/** PJ apontando para uma PF que não existe: 422 — o formato está certo, o estado não. */
public class ResponsibleNotFoundException extends RuntimeException {

    public ResponsibleNotFoundException(Long id) {
        super("Pessoa física responsável não encontrada: " + id);
    }
}
