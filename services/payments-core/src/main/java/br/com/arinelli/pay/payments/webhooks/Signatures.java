package br.com.arinelli.pay.payments.webhooks;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Comparações de segredo de webhook — sempre em tempo constante. */
public final class Signatures {

    private Signatures() {
    }

    /** HMAC-SHA256 hex do corpo cru contra o header recebido. */
    public static boolean hmacSha256Matches(byte[] rawBody, String hexSignature, byte[] secret) {
        if (hexSignature == null || hexSignature.isBlank()) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            byte[] expected = mac.doFinal(rawBody);
            byte[] provided = HexFormat.of().parseHex(hexSignature.trim().toLowerCase());
            return MessageDigest.isEqual(expected, provided);
        } catch (NoSuchAlgorithmException | InvalidKeyException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Segredo compartilhado, byte a byte, sem early-return. Segredo não configurado
     * ou vazio reprova sempre — fail closed, nunca "sem segredo, então libera".
     */
    public static boolean secretMatches(String provided, String expected) {
        if (expected == null || expected.isBlank() || provided == null || provided.isBlank()) {
            return false;
        }
        return MessageDigest.isEqual(
                provided.getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8));
    }
}
