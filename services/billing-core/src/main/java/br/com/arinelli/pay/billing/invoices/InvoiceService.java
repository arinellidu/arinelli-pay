package br.com.arinelli.pay.billing.invoices;

import br.com.arinelli.pay.billing.contracts.Contract;
import br.com.arinelli.pay.billing.contracts.ContractEndedException;
import br.com.arinelli.pay.billing.contracts.ContractNotFoundException;
import br.com.arinelli.pay.billing.contracts.ContractRepository;
import br.com.arinelli.pay.billing.contracts.ContractStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class InvoiceService {

    private final InvoiceRepository invoices;
    private final ContractRepository contracts;

    public InvoiceService(InvoiceRepository invoices, ContractRepository contracts) {
        this.invoices = invoices;
        this.contracts = contracts;
    }

    /** Geração explícita da próxima fatura OPEN (sem scheduler) — regra em DueDateRule. */
    @Transactional
    public InvoiceResponse generateNext(Long contractId) {
        Contract contract = contracts.findWithClientById(contractId)
                .orElseThrow(() -> new ContractNotFoundException(contractId));
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new ContractEndedException(contractId);
        }
        LocalDate latestDue = invoices
                .findTopByContractIdAndStatusNotOrderByDueDateDesc(contractId, InvoiceStatus.CANCELED)
                .map(Invoice::getDueDate)
                .orElse(null);
        LocalDate dueDate = DueDateRule.nextDueDate(LocalDate.now(), contract.getBillingDay(), latestDue);
        Invoice saved = invoices.saveAndFlush(new Invoice(contract, contract.getAmount(), dueDate));
        return InvoiceResponse.from(saved);
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
