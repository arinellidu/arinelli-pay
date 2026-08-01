package br.com.arinelli.pay.payments.common;

import br.com.arinelli.pay.payments.charges.ChargeExceptions.ChargeNotFoundException;
import br.com.arinelli.pay.payments.charges.ChargeExceptions.InvoiceNotChargeableException;
import br.com.arinelli.pay.payments.charges.ChargeExceptions.InvoiceNotFoundException;
import br.com.arinelli.pay.payments.charges.ChargeExceptions.UnsupportedRailException;
import br.com.arinelli.pay.payments.pix.PixProviderException;
import br.com.arinelli.pay.payments.webhooks.InvalidWebhookPayloadException;
import br.com.arinelli.pay.payments.webhooks.InvalidWebhookSignatureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/** Erros de API sempre como RFC 9457 ProblemDetail. */
@RestControllerAdvice
class ApiExceptionHandler {

    /** I1 na borda do serviço: mutação de pagamento sem Idempotency-Key é 400. */
    @ExceptionHandler(MissingRequestHeaderException.class)
    ProblemDetail missingHeader(MissingRequestHeaderException ex) {
        String detail = "Idempotency-Key".equalsIgnoreCase(ex.getHeaderName())
                ? "Header Idempotency-Key é obrigatório em mutações de pagamento"
                : "Header obrigatório ausente: " + ex.getHeaderName();
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
        problem.setTitle("Header obrigatório ausente");
        return problem;
    }

    @ExceptionHandler({ChargeNotFoundException.class, InvoiceNotFoundException.class})
    ProblemDetail notFound(RuntimeException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Recurso não encontrado");
        return problem;
    }

    @ExceptionHandler(InvoiceNotChargeableException.class)
    ProblemDetail notChargeable(InvoiceNotChargeableException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Fatura não cobrável");
        return problem;
    }

    @ExceptionHandler(UnsupportedRailException.class)
    ProblemDetail unsupportedRail(UnsupportedRailException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setTitle("Trilho não suportado");
        return problem;
    }

    /** I5: assinatura inválida → 401; o corpo cru já foi registrado com signature_ok=false. */
    @ExceptionHandler(InvalidWebhookSignatureException.class)
    ProblemDetail invalidSignature(InvalidWebhookSignatureException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        problem.setTitle("Assinatura inválida");
        return problem;
    }

    @ExceptionHandler(InvalidWebhookPayloadException.class)
    ProblemDetail invalidWebhookPayload(InvalidWebhookPayloadException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setTitle("Payload de webhook inválido");
        return problem;
    }

    @ExceptionHandler(PixProviderException.class)
    ProblemDetail providerFailure(PixProviderException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, ex.getMessage());
        problem.setTitle("Provider Pix indisponível");
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail invalidBody(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .sorted()
                .collect(Collectors.joining("; "));
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
        problem.setTitle("Corpo da requisição inválido");
        return problem;
    }
}
