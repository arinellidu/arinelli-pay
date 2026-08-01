package br.com.arinelli.pay.billing.clients;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ClientService {

    private final ClientRepository repository;

    public ClientService(ClientRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Client create(ClientRequest request) {
        String document = DocumentValidator.normalize(request.document());
        DocumentType type = DocumentValidator.validate(document)
                .orElseThrow(() -> new InvalidDocumentException(request.document()));

        if (repository.existsByDocument(document)) {
            throw new DuplicateDocumentException(document);
        }
        try {
            return repository.saveAndFlush(new Client(document, type, request.name().trim(), request.email()));
        } catch (DataIntegrityViolationException e) {
            // corrida entre o exists e o insert: uq_clients_document decide
            throw new DuplicateDocumentException(document);
        }
    }

    @Transactional(readOnly = true)
    public List<Client> findAll() {
        return repository.findAll(Sort.by("id"));
    }

    @Transactional(readOnly = true)
    public Client findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new ClientNotFoundException(id));
    }

    @Transactional
    public Client update(Long id, ClientRequest request) {
        Client client = repository.findById(id).orElseThrow(() -> new ClientNotFoundException(id));

        String document = DocumentValidator.normalize(request.document());
        DocumentType type = DocumentValidator.validate(document)
                .orElseThrow(() -> new InvalidDocumentException(request.document()));

        if (!document.equals(client.getDocument()) && repository.existsByDocument(document)) {
            throw new DuplicateDocumentException(document);
        }
        client.update(document, type, request.name().trim(), request.email());
        try {
            repository.flush();
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateDocumentException(document);
        }
        return client;
    }
}
