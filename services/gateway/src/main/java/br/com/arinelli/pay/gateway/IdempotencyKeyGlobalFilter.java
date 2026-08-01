package br.com.arinelli.pay.gateway;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Set;

/**
 * I1 na borda: mutação em /api/payments/charges sem Idempotency-Key morre no
 * gateway com 400 ProblemDetail, antes de tocar o payments-core.
 */
@Component
public class IdempotencyKeyGlobalFilter implements GlobalFilter, Ordered {

    private static final Set<HttpMethod> MUTATIONS =
            Set.of(HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH, HttpMethod.DELETE);

    private static final String PROBLEM_JSON = """
            {"type":"about:blank","title":"Header obrigatório ausente",\
            "status":400,"detail":"Idempotency-Key é obrigatório em mutações de pagamento",\
            "instance":"%s"}""";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        var request = exchange.getRequest();
        String path = request.getPath().value();
        boolean mutatesCharges = MUTATIONS.contains(request.getMethod())
                && path.startsWith("/api/payments/charges");

        if (mutatesCharges && !request.getHeaders().containsHeader("Idempotency-Key")) {
            var response = exchange.getResponse();
            response.setStatusCode(HttpStatus.BAD_REQUEST);
            response.getHeaders().setContentType(MediaType.APPLICATION_PROBLEM_JSON);
            byte[] body = PROBLEM_JSON.formatted(path).getBytes(StandardCharsets.UTF_8);
            return response.writeWith(Mono.just(response.bufferFactory().wrap(body)));
        }
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return -100; // antes do roteamento
    }
}
