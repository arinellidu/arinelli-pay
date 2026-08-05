package br.com.arinelli.pay.billing.invoices;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.LocalDate;

@RestController
class InvoiceController {

    private final InvoiceService service;

    InvoiceController(InvoiceService service) {
        this.service = service;
    }

    /** I1: sem Idempotency-Key não gera fatura; replay devolve 200 com a original. */
    @PostMapping("/contracts/{contractId}/invoices:generate-next")
    ResponseEntity<InvoiceResponse> generateNext(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @PathVariable Long contractId) {
        InvoiceService.GenerateResult result = service.generateNext(idempotencyKey, contractId);
        InvoiceResponse body = result.invoice();
        if (result.created()) {
            return ResponseEntity.created(URI.create("/invoices/" + body.id())).body(body);
        }
        return ResponseEntity.ok(body);
    }

    @GetMapping("/invoices")
    Page<InvoiceResponse> search(
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20) Pageable pageable) {
        return service.search(status, clientId, from, to, pageable);
    }
}
