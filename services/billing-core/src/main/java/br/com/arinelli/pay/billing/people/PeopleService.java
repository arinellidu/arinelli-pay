package br.com.arinelli.pay.billing.people;

import br.com.arinelli.pay.billing.clients.DocumentValidator;
import br.com.arinelli.pay.billing.clients.DuplicateDocumentException;
import br.com.arinelli.pay.billing.clients.InvalidDocumentException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Cadastro de pessoas. O BFF já validou formato com zod (schema espelhado do
 * formulário), mas o core é a autoridade: renormaliza, reconfere dígito
 * verificador (DocumentValidator do P01) e deixa o unique do banco decidir a
 * corrida do duplicado — exatamente como clients.
 */
@Service
public class PeopleService {

    private static final Sort NEWEST_FIRST =
            Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final NaturalPersonRepository naturalRepository;
    private final LegalPersonRepository legalRepository;

    public PeopleService(NaturalPersonRepository naturalRepository, LegalPersonRepository legalRepository) {
        this.naturalRepository = naturalRepository;
        this.legalRepository = legalRepository;
    }

    @Transactional(readOnly = true)
    public List<NaturalPerson> listNatural() {
        return naturalRepository.findAll(NEWEST_FIRST);
    }

    @Transactional
    public NaturalPerson createNatural(NaturalPersonRequest request) {
        String cpf = DocumentValidator.normalize(request.cpf());
        if (!DocumentValidator.isValidCpf(cpf)) {
            throw new InvalidDocumentException(request.cpf());
        }
        if (naturalRepository.existsByCpf(cpf)) {
            throw new DuplicateDocumentException(cpf);
        }
        NaturalPerson person = new NaturalPerson(
                request.nome().trim(),
                cpf,
                blankToNull(request.email()),
                digitsOrNull(request.telefone()),
                addressOf(request.cep(), request.logradouro(), request.numero(),
                        request.complemento(), request.bairro(), request.cidade(), request.uf()));
        try {
            return naturalRepository.saveAndFlush(person);
        } catch (DataIntegrityViolationException e) {
            // corrida entre o exists e o insert: uq_natural_persons_cpf decide
            throw new DuplicateDocumentException(cpf);
        }
    }

    @Transactional(readOnly = true)
    public List<LegalPerson> listLegal() {
        return legalRepository.findAll(NEWEST_FIRST);
    }

    @Transactional
    public LegalPerson createLegal(LegalPersonRequest request) {
        String cnpj = DocumentValidator.normalize(request.cnpj());
        if (!DocumentValidator.isValidCnpj(cnpj)) {
            throw new InvalidDocumentException(request.cnpj());
        }
        if (legalRepository.existsByCnpj(cnpj)) {
            throw new DuplicateDocumentException(cnpj);
        }
        NaturalPerson responsible = naturalRepository.findById(request.responsavelId())
                .orElseThrow(() -> new ResponsibleNotFoundException(request.responsavelId()));

        LegalPerson company = new LegalPerson(
                request.razaoSocial().trim(),
                blankToNull(request.nomeFantasia()),
                cnpj,
                request.emailContato().trim(),
                digitsOrNull(request.telefoneContato()),
                responsible,
                addressOf(request.cep(), request.logradouro(), request.numero(),
                        request.complemento(), request.bairro(), request.cidade(), request.uf()));
        try {
            return legalRepository.saveAndFlush(company);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateDocumentException(cnpj);
        }
    }

    private static Address addressOf(String cep, String logradouro, String numero,
                                     String complemento, String bairro, String cidade, String uf) {
        String zipCode = digitsOrNull(cep);
        String street = blankToNull(logradouro);
        String number = blankToNull(numero);
        String complement = blankToNull(complemento);
        String district = blankToNull(bairro);
        String city = blankToNull(cidade);
        String state = blankToNull(uf);
        if (zipCode == null && street == null && number == null && complement == null
                && district == null && city == null && state == null) {
            return null;
        }
        return new Address(zipCode, street, number, complement, district, city,
                state == null ? null : state.toUpperCase());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String digitsOrNull(String value) {
        if (value == null) {
            return null;
        }
        String digits = value.replaceAll("\\D", "");
        return digits.isEmpty() ? null : digits;
    }
}
