package br.com.arinelli.pay.billing.clients;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corpo de POST/PUT /clients. document aceita máscara (normalizada no service). */
public record ClientRequest(
        @NotBlank @Size(max = 20) String document,
        @NotBlank @Size(max = 160) String name,
        @Email @Size(max = 160) String email) {
}
