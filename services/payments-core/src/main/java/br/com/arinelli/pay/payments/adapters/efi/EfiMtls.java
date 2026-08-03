package br.com.arinelli.pay.payments.adapters.efi;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.security.KeyStore;

/**
 * A Efí exige mTLS em TODA chamada da API Pix — inclusive no /oauth/token. O
 * certificado é um PKCS#12 emitido no painel; a senha é vazia nos certificados padrão.
 */
final class EfiMtls {

    private EfiMtls() {
    }

    static SSLContext sslContext(String certPath, String certPassword) {
        Path path = Path.of(certPath);
        if (!Files.isReadable(path)) {
            throw new IllegalStateException(
                    "certificado mTLS da Efí não encontrado ou sem permissão de leitura: " + path.toAbsolutePath());
        }
        char[] password = certPassword == null ? new char[0] : certPassword.toCharArray();
        try (InputStream in = Files.newInputStream(path)) {
            KeyStore keyStore = KeyStore.getInstance("PKCS12");
            keyStore.load(in, password);

            KeyManagerFactory keyManagers = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
            keyManagers.init(keyStore, password);

            SSLContext context = SSLContext.getInstance("TLS");
            // trust managers null = truststore padrão da JVM valida o certificado da Efí
            context.init(keyManagers.getKeyManagers(), null, null);
            return context;
        } catch (GeneralSecurityException | IOException e) {
            throw new IllegalStateException("falha ao carregar o certificado mTLS da Efí (" + path.toAbsolutePath()
                    + "): " + e.getMessage() + " — se o .p12 for antigo, reexporte-o (ver docs/providers/EFI.md)", e);
        }
    }
}
