package br.com.arinelli.pay.billing.people;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

interface LegalPersonRepository extends JpaRepository<LegalPerson, Long> {

    boolean existsByCnpj(String cnpj);

    @EntityGraph(attributePaths = "responsible")
    Optional<LegalPerson> findWithResponsibleById(Long id);

    /** Lista sempre com o responsável junto — o GET embute {id, nome, cpf} sem N+1. */
    @EntityGraph(attributePaths = "responsible")
    @Override
    List<LegalPerson> findAll(Sort sort);
}
