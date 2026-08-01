package br.com.arinelli.pay.billing.common;

import br.com.arinelli.pay.billing.clients.ClientNotFoundException;
import br.com.arinelli.pay.billing.clients.DuplicateDocumentException;
import br.com.arinelli.pay.billing.clients.InvalidDocumentException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/** Erros de API sempre como RFC 9457 ProblemDetail. */
@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(InvalidDocumentException.class)
    ProblemDetail invalidDocument(InvalidDocumentException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setTitle("Documento inválido");
        return problem;
    }

    @ExceptionHandler(DuplicateDocumentException.class)
    ProblemDetail duplicateDocument(DuplicateDocumentException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Documento duplicado");
        return problem;
    }

    @ExceptionHandler(ClientNotFoundException.class)
    ProblemDetail clientNotFound(ClientNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Recurso não encontrado");
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
