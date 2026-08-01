package br.com.arinelli.pay.gateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

/** X-Request-Id: gera se ausente, propaga ao downstream e devolve na resposta. */
@Component
public class RequestIdGlobalFilter implements GlobalFilter, Ordered {

    public static final String HEADER = "X-Request-Id";

    private static final Logger log = LoggerFactory.getLogger(RequestIdGlobalFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String requestId = exchange.getRequest().getHeaders().getFirst(HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        final String rid = requestId;

        ServerWebExchange mutated = exchange.mutate()
                .request(builder -> builder.header(HEADER, rid))
                .build();
        mutated.getResponse().getHeaders().set(HEADER, rid);

        log.info("gateway {} {} rid={}", exchange.getRequest().getMethod(),
                exchange.getRequest().getPath().value(), rid);
        return chain.filter(mutated);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE; // primeiro de todos: tudo ganha rid
    }
}
