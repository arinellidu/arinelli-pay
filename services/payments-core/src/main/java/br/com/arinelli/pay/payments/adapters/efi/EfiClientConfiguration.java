package br.com.arinelli.pay.payments.adapters.efi;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;

/**
 * Ligado por {@code PIX_PROVIDER=efi}. Só aqui existe SSLContext, HttpClient e
 * qualquer coisa que cheire a transporte — o resto do serviço vê apenas o port.
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "pix.provider", havingValue = "efi")
class EfiClientConfiguration {

    private static final Logger log = LoggerFactory.getLogger(EfiClientConfiguration.class);

    @Bean
    EfiProperties efiProperties(
            @Value("${pix.efi.base-url:}") String baseUrl,
            @Value("${pix.efi.client-id:}") String clientId,
            @Value("${pix.efi.client-secret:}") String clientSecret,
            @Value("${pix.efi.cert-path:}") String certPath,
            @Value("${pix.efi.cert-password:}") String certPassword,
            @Value("${pix.efi.pix-key:}") String pixKey,
            @Value("${pix.efi.expiration-seconds:3600}") int expirationSeconds,
            @Value("${pix.efi.connect-timeout:3s}") Duration connectTimeout,
            @Value("${pix.efi.read-timeout:10s}") Duration readTimeout) {
        EfiProperties properties = new EfiProperties(baseUrl, clientId, clientSecret, certPath, certPassword,
                pixKey, expirationSeconds, connectTimeout, readTimeout);
        properties.validate();
        log.info("provider Pix = efi ({}), cobranças expiram em {}s", baseUrl, expirationSeconds);
        return properties;
    }

    /**
     * mTLS em todas as chamadas, inclusive /oauth/token. HTTP/1.1 explícito: a
     * negociação HTTP/2 do JDK sobre mTLS não traz ganho aqui e já custou
     * incompatibilidade com PSP em produção — nesta borda, previsível ganha.
     */
    @Bean
    RestClient efiRestClient(EfiProperties properties) {
        HttpClient httpClient = HttpClient.newBuilder()
                .sslContext(EfiMtls.sslContext(properties.certPath(), properties.certPassword()))
                .connectTimeout(properties.connectTimeout())
                .version(HttpClient.Version.HTTP_1_1)
                .build();

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(properties.readTimeout());

        return RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    @Bean
    EfiTokenProvider efiTokenProvider(RestClient efiRestClient, EfiProperties properties) {
        return new EfiTokenProvider(efiRestClient, properties.clientId(), properties.clientSecret(), Clock.systemUTC());
    }

    @Bean
    EfiAdapter efiAdapter(RestClient efiRestClient, EfiTokenProvider efiTokenProvider, EfiProperties properties) {
        return new EfiAdapter(efiRestClient, efiTokenProvider, properties.pixKey(), properties.expirationSeconds());
    }
}
