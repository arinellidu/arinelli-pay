package br.com.arinelli.pay.billing.invoices;

import br.com.arinelli.pay.billing.contracts.Contract;
import br.com.arinelli.pay.billing.contracts.ContractEndedException;
import br.com.arinelli.pay.billing.contracts.ContractNotFoundException;
import br.com.arinelli.pay.billing.contracts.ContractRepository;
import br.com.arinelli.pay.billing.contracts.ContractStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class InvoiceService {

    private final InvoiceRepository invoices;
    private final ContractRepository contracts;
    private final TransactionTemplate tx;

    public InvoiceService(InvoiceRepository invoices, ContractRepository contracts,
                          PlatformTransactionManager txManager) {
        this.invoices = invoices;
        this.contracts = contracts;
        this.tx = new TransactionTemplate(txManager);
    }

    /** Fatura gerada agora (`created`) ou a que já existia para o mesmo pedido. */
    public record GenerateResult(InvoiceResponse invoice, boolean created) {
    }

    /**
     * Geração explícita da próxima fatura OPEN (sem scheduler) — regra em DueDateRule.
     *
     * I1 aqui vale por duas travas do banco, cada uma para um erro diferente:
     * replay do MESMO pedido (uq_invoices_idem) devolve a fatura original, e
     * dois pedidos concorrentes que calcularam a MESMA competência
     * (uq_invoices_contract_due) terminam na mesma fatura — quem perde o insert
     * carrega a vencedora. Sem transação no método: o conflito precisa ser lido
     * depois do rollback, não dentro dele.
     */
    public GenerateResult generateNext(String idempotencyKey, Long contractId) {
        var replay = invoices.findByIdempotencyKey(idempotencyKey);
        if (replay.isPresent()) {
            return new GenerateResult(InvoiceResponse.from(replay.get()), false);
        }
        try {
            Invoice saved = tx.execute(status -> {
                Contract contract = activeContract(contractId);
                LocalDate dueDate = nextDueDate(contract);
                return invoices.saveAndFlush(
                        new Invoice(contract, contract.getAmount(), dueDate, idempotencyKey));
            });
            return new GenerateResult(InvoiceResponse.from(saved), true);
        } catch (DataIntegrityViolationException e) {
            return new GenerateResult(InvoiceResponse.from(conflictWinner(idempotencyKey, contractId, e)), false);
        }
    }

    /** Quem já ocupava o lugar: a mesma key ou a mesma competência do contrato. */
    private Invoice conflictWinner(String idempotencyKey, Long contractId, DataIntegrityViolationException e) {
        return invoices.findByIdempotencyKey(idempotencyKey)
                .or(() -> invoices.findByContractIdAndDueDateAndStatusNot(
                        contractId, nextDueDate(activeContract(contractId)), InvoiceStatus.CANCELED))
                .orElseThrow(() -> e);
    }

    private Contract activeContract(Long contractId) {
        Contract contract = contracts.findWithClientById(contractId)
                .orElseThrow(() -> new ContractNotFoundException(contractId));
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new ContractEndedException(contractId);
        }
        return contract;
    }

    private LocalDate nextDueDate(Contract contract) {
        LocalDate latestDue = invoices
                .findTopByContractIdAndStatusNotOrderByDueDateDesc(contract.getId(), InvoiceStatus.CANCELED)
                .map(Invoice::getDueDate)
                .orElse(null);
        return DueDateRule.nextDueDate(LocalDate.now(), contract.getBillingDay(), latestDue);
    }

    @Transactional(readOnly = true)
    public Page<InvoiceResponse> search(InvoiceStatus status, Long clientId, LocalDate from, LocalDate to,
                                        Pageable pageable) {
        Specification<Invoice> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (clientId != null) {
                predicates.add(cb.equal(root.get("contract").get("client").get("id"), clientId));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dueDate"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dueDate"), to));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return invoices.findAll(spec, pageable).map(InvoiceResponse::from);
    }

    /** OPEN vencida vira OVERDUE; chamado pelo job diário. Retorna quantas mudaram. */
    @Transactional
    public int markOverdue(LocalDate today) {
        return invoices.markOverdue(today, InvoiceStatus.OPEN, InvoiceStatus.OVERDUE);
    }
}
