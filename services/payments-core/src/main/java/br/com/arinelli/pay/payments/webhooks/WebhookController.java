package br.com.arinelli.pay.payments.webhooks;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Map;

@RestController
class WebhookController {

    private final WebhookService service;

    WebhookController(WebhookService service) {
        this.service = service;
    }

    /** Corpo chega CRU (byte[]) — a assinatura é sobre os bytes exatos (I5). */
    @PostMapping("/webhooks/pix")
    ResponseEntity<Map<String, String>> pix(
            @RequestBody byte[] rawBody,
            @RequestHeader(name = "X-Signature", required = false) String signature) {
        WebhookService.Result result = service.process(rawBody, signature);
        return ResponseEntity.ok(Map.of("result", result.name().toLowerCase(Locale.ROOT)));
    }
}
