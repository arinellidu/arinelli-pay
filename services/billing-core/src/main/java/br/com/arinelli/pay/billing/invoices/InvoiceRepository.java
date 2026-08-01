package br.com.arinelli.pay.billing.invoices;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {

    @Override
    @EntityGraph(attributePaths = {"contract", "contract.client"})
    Page<Invoice> findAll(Specification<Invoice> spec, Pageable pageable);

    /** Última fatura não cancelada do contrato — âncora da sequência de geração. */
    Optional<Invoice> findTopByContractIdAndStatusNotOrderByDueDateDesc(Long contractId, InvoiceStatus excluded);

    @Modifying(clearAutomatically = true)
    @Query("update Invoice i set i.status = :overdue where i.status = :open and i.dueDate < :today")
    int markOverdue(@Param("today") LocalDate today,
                    @Param("open") InvoiceStatus open,
                    @Param("overdue") InvoiceStatus overdue);
}
