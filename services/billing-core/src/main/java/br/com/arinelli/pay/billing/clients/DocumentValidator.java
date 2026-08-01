package br.com.arinelli.pay.billing.clients;

import java.util.Optional;

/**
 * Validação pura de CPF e CNPJ (dígitos verificadores, sem lib externa).
 * Entrada dos métodos isValid*: string já normalizada (só dígitos).
 */
public final class DocumentValidator {

    private DocumentValidator() {
    }

    /** Remove tudo que não for dígito (strip de máscara). Null-safe. */
    public static String normalize(String raw) {
        return raw == null ? "" : raw.replaceAll("\\D", "");
    }

    /** Infere o tipo pelo tamanho e valida os dígitos verificadores. */
    public static Optional<DocumentType> validate(String digits) {
        if (digits == null) {
            return Optional.empty();
        }
        if (digits.length() == 11 && isValidCpf(digits)) {
            return Optional.of(DocumentType.CPF);
        }
        if (digits.length() == 14 && isValidCnpj(digits)) {
            return Optional.of(DocumentType.CNPJ);
        }
        return Optional.empty();
    }

    public static boolean isValidCpf(String cpf) {
        if (cpf == null || cpf.length() != 11 || notAllDigits(cpf) || allSameDigit(cpf)) {
            return false;
        }
        return digitAt(cpf, 9) == cpfCheckDigit(cpf, 9, 10)
                && digitAt(cpf, 10) == cpfCheckDigit(cpf, 10, 11);
    }

    public static boolean isValidCnpj(String cnpj) {
        if (cnpj == null || cnpj.length() != 14 || notAllDigits(cnpj) || allSameDigit(cnpj)) {
            return false;
        }
        return digitAt(cnpj, 12) == cnpjCheckDigit(cnpj, 12)
                && digitAt(cnpj, 13) == cnpjCheckDigit(cnpj, 13);
    }

    private static int cpfCheckDigit(String cpf, int length, int startWeight) {
        int sum = 0;
        for (int i = 0; i < length; i++) {
            sum += digitAt(cpf, i) * (startWeight - i);
        }
        int remainder = (sum * 10) % 11;
        return remainder == 10 ? 0 : remainder;
    }

    private static int cnpjCheckDigit(String cnpj, int length) {
        int[] weights = length == 12
                ? new int[] {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
                : new int[] {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int sum = 0;
        for (int i = 0; i < length; i++) {
            sum += digitAt(cnpj, i) * weights[i];
        }
        int remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }

    private static boolean notAllDigits(String s) {
        return !s.chars().allMatch(Character::isDigit);
    }

    private static boolean allSameDigit(String s) {
        return s.chars().distinct().count() == 1;
    }

    private static int digitAt(String s, int i) {
        return s.charAt(i) - '0';
    }
}
