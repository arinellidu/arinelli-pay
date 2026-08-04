package br.com.arinelli.pay.billing.people;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface LegalPersonRepository extends JpaRepository<LegalPerson, Long> {

    boolean existsByCnpj(String cnpj);

    /** Lista sempre com o responsável junto — o GET embute {id, nome, cpf} sem N+1. */
    @EntityGraph(attributePaths = "responsible")
    @Override
    List<LegalPerson> findAll(Sort sort);
}
