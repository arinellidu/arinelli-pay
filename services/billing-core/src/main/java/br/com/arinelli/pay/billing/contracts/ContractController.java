package br.com.arinelli.pay.billing.contracts;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/contracts")
class ContractController {

    private final ContractService service;

    ContractController(ContractService service) {
        this.service = service;
    }

    @PostMapping
    ResponseEntity<ContractResponse> create(@Valid @RequestBody ContractRequest request) {
        ContractResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/contracts/" + created.id())).body(created);
    }

    @GetMapping
    List<ContractResponse> list(@RequestParam(required = false) Long clientId) {
        return service.list(clientId);
    }

    @GetMapping("/{id}")
    ContractResponse get(@PathVariable Long id) {
        return service.get(id);
    }
}
