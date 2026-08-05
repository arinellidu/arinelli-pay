package br.com.arinelli.pay.billing.common;

import br.com.arinelli.pay.billing.clients.ClientNotFoundException;
import br.com.arinelli.pay.billing.clients.DuplicateDocumentException;
import br.com.arinelli.pay.billing.clients.InvalidDocumentException;
import br.com.arinelli.pay.billing.contracts.ContractEndedException;
import br.com.arinelli.pay.billing.contracts.ContractNotFoundException;
import br.com.arinelli.pay.billing.people.PersonNotFoundException;
import br.com.arinelli.pay.billing.people.ResponsibleNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

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

    @ExceptionHandler({ClientNotFoundException.class, ContractNotFoundException.class, PersonNotFoundException.class})
    ProblemDetail notFound(RuntimeException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Recurso não encontrado");
        return problem;
    }

    @ExceptionHandler(ContractEndedException.class)
    ProblemDetail contractEnded(ContractEndedException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Contrato encerrado");
        return problem;
    }

    @ExceptionHandler(ResponsibleNotFoundException.class)
    ProblemDetail responsibleNotFound(ResponsibleNotFoundException ex) {
        // 422, não 404: a rota existe e o corpo está bem formado — o estado do cadastro é que não fecha
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_CONTENT, ex.getMessage());
        problem.setTitle("Responsável legal não encontrado");
        return problem;
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ProblemDetail typeMismatch(MethodArgumentTypeMismatchException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Parâmetro inválido: " + ex.getName());
        problem.setTitle("Parâmetro inválido");
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
