package br.com.arinelli.pay.billing.clients;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/clients")
class ClientController {

    private final ClientService service;

    ClientController(ClientService service) {
        this.service = service;
    }

    @PostMapping
    ResponseEntity<ClientResponse> create(@Valid @RequestBody ClientRequest request) {
        Client saved = service.create(request);
        return ResponseEntity
                .created(URI.create("/clients/" + saved.getId()))
                .body(ClientResponse.from(saved));
    }

    @GetMapping
    List<ClientResponse> list() {
        return service.findAll().stream().map(ClientResponse::from).toList();
    }

    @GetMapping("/{id}")
    ClientResponse get(@PathVariable Long id) {
        return ClientResponse.from(service.findById(id));
    }

    @PutMapping("/{id}")
    ClientResponse update(@PathVariable Long id, @Valid @RequestBody ClientRequest request) {
        return ClientResponse.from(service.update(id, request));
    }
}
