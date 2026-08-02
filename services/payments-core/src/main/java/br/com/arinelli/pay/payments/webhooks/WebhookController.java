package br.com.arinelli.pay.payments.webhooks;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Map;

@RestController
class WebhookController {

    private final WebhookService service;

    WebhookController(WebhookService service) {
        this.service = service;
    }

    /** Convenção de dev (fake / pix-sandbox): HMAC no header sobre o corpo CRU. */
    @PostMapping("/webhooks/pix")
    ResponseEntity<Map<String, String>> pix(
            @RequestBody byte[] rawBody,
            @RequestHeader Map<String, String> headers,
            @RequestParam Map<String, String> query) {
        return respond(service.process("pix", rawBody, new WebhookRequest(headers, query)));
    }

    /**
     * Efí. Os dois paths são o mesmo endpoint de propósito: a Efí ACRESCENTA
     * {@code /pix} à URL cadastrada em {@code PUT /v2/webhook/{chave}}, e a chamada
     * de teste da configuração vai na URL sem sufixo.
     */
    @PostMapping({"/webhooks/efi", "/webhooks/efi/pix"})
    ResponseEntity<Map<String, String>> efi(
            @RequestBody byte[] rawBody,
            @RequestHeader Map<String, String> headers,
            @RequestParam Map<String, String> query) {
        return respond(service.process("efi", rawBody, new WebhookRequest(headers, query)));
    }

    private static ResponseEntity<Map<String, String>> respond(WebhookService.Result result) {
        return ResponseEntity.ok(Map.of("result", result.name().toLowerCase(Locale.ROOT)));
    }
}
