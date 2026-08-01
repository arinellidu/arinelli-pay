package br.com.arinelli.pay.payments.charges;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChargeRepository extends JpaRepository<Charge, Long> {

    Optional<Charge> findByIdempotencyKey(String idempotencyKey);

    Optional<Charge> findByProviderRef(String providerRef);

    List<Charge> findByInvoiceIdOrderById(Long invoiceId);
}
