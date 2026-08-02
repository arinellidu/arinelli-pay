package br.com.arinelli.pay.payments.pix;

/**
 * Estado da cobrança no provider, em vocabulário do domínio (I4).
 * A tradução dos códigos do PSP (ATIVA, CONCLUIDA, REMOVIDA_PELO_PSP…) mora em adapters/.
 */
public enum PixStatus {

    /** Cobrança criada e aguardando pagamento. */
    ACTIVE,

    /** Pagamento confirmado pelo provider. */
    SETTLED,

    /** Cobrança cancelada/expirada — não recebe mais pagamento. */
    REMOVED,

    /** Provider não expõe consulta (dev) ou devolveu um código desconhecido. */
    UNKNOWN
}
