package br.com.arinelli.pay.billing.contracts;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContractRepository extends JpaRepository<Contract, Long> {

    @EntityGraph(attributePaths = "client")
    List<Contract> findByClientIdOrderById(Long clientId);

    @EntityGraph(attributePaths = "client")
    List<Contract> findAllByOrderById();

    @EntityGraph(attributePaths = "client")
    Optional<Contract> findWithClientById(Long id);
}
