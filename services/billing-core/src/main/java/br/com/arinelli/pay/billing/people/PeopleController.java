package br.com.arinelli.pay.billing.people;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/people")
class PeopleController {

    private final PeopleService service;

    PeopleController(PeopleService service) {
        this.service = service;
    }

    @GetMapping("/pf")
    List<NaturalPersonResponse> listNatural() {
        return service.listNatural().stream().map(NaturalPersonResponse::from).toList();
    }

    @PostMapping("/pf")
    ResponseEntity<NaturalPersonResponse> createNatural(@Valid @RequestBody NaturalPersonRequest request) {
        NaturalPerson saved = service.createNatural(request);
        return ResponseEntity
                .created(URI.create("/people/pf/" + saved.getId()))
                .body(NaturalPersonResponse.from(saved));
    }

    @GetMapping("/pj")
    List<LegalPersonResponse> listLegal() {
        return service.listLegal().stream().map(LegalPersonResponse::from).toList();
    }

    @PostMapping("/pj")
    ResponseEntity<LegalPersonResponse> createLegal(@Valid @RequestBody LegalPersonRequest request) {
        LegalPerson saved = service.createLegal(request);
        return ResponseEntity
                .created(URI.create("/people/pj/" + saved.getId()))
                .body(LegalPersonResponse.from(saved));
    }
}
