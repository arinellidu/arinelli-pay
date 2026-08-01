package br.com.arinelli.pay.payments.charges;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
class ChargeController {

    private final ChargeService service;

    ChargeController(ChargeService service) {
        this.service = service;
    }

    @PostMapping("/charges")
    ResponseEntity<ChargeResponse> create(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody ChargeRequest request) {
        ChargeService.CreateResult result = service.create(idempotencyKey, request);
        ChargeResponse body = service.toResponse(result.charge());
        if (result.created()) {
            return ResponseEntity.created(URI.create("/charges/" + body.id())).body(body);
        }
        return ResponseEntity.ok(body);
    }

    @GetMapping("/charges/{id}")
    ChargeResponse get(@PathVariable Long id) {
        return service.toResponse(service.get(id));
    }

    @GetMapping("/invoices/{invoiceId}/charges")
    List<ChargeResponse> byInvoice(@PathVariable Long invoiceId) {
        return service.byInvoice(invoiceId).stream().map(service::toResponse).toList();
    }
}
