package br.com.arinelli.pay.payments.adapters.efi;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Configuração da Efí. Segredos só por env (nada versionado) — o application.yml
 * apenas mapeia as variáveis.
 *
 * @param baseUrl           homologação {@code https://pix-h.api.efipay.com.br}, produção {@code https://pix.api.efipay.com.br}
 * @param certPath          caminho do {@code .p12} emitido pela Efí (mTLS obrigatório em toda chamada)
 * @param certPassword      senha do {@code .p12} — vazia nos certificados padrão da Efí
 * @param pixKey            chave Pix do recebedor cadastrada na conta
 * @param expirationSeconds {@code calendario.expiracao} da cobrança imediata
 */
record EfiProperties(
        String baseUrl,
        String clientId,
        String clientSecret,
        String certPath,
        String certPassword,
        String pixKey,
        int expirationSeconds,
        Duration connectTimeout,
        Duration readTimeout) {

    /**
     * Falha no boot, não na primeira cobrança: subir com PIX_PROVIDER=efi e credencial
     * faltando é erro de operação, e o lugar de descobrir isso é o startup.
     */
    void validate() {
        List<String> missing = new ArrayList<>();
        require(missing, "EFI_CLIENT_ID", clientId);
        require(missing, "EFI_CLIENT_SECRET", clientSecret);
        require(missing, "EFI_CERT_PATH", certPath);
        require(missing, "EFI_PIX_KEY", pixKey);
        require(missing, "EFI_BASE_URL", baseUrl);
        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "PIX_PROVIDER=efi exige as variáveis: " + String.join(", ", missing));
        }
        if (expirationSeconds <= 0) {
            throw new IllegalStateException("pix.efi.expiration-seconds deve ser > 0");
        }
    }

    private static void require(List<String> missing, String name, String value) {
        if (value == null || value.isBlank()) {
            missing.add(name);
        }
    }
}
