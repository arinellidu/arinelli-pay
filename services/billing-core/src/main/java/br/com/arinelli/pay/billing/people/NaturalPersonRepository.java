package br.com.arinelli.pay.billing.people;

import org.springframework.data.jpa.repository.JpaRepository;

interface NaturalPersonRepository extends JpaRepository<NaturalPerson, Long> {

    boolean existsByCpf(String cpf);
}
