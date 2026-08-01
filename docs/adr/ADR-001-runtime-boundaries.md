# ADR-001 — Fronteiras de runtime

**Status:** Aceito · 2026-08-01

## Contexto
Quatro naturezas de trabalho: domínio transacional rico; trabalho concorrente e I/O-bound; agregação para a UI; interface. Projeto conduzido por um engenheiro solo — cada runtime adicional custa manutenção real.

## Decisão
- **Java 25 LTS + Spring Boot 4.1** no core (billing-core, payments-core) e no **gateway** (Spring Cloud Gateway). Justificativa de versão: toda a linha Spring Boot 3.x atingiu EOL open-source em 30/jun/2026; iniciar projeto novo em versão sem patches seria indefensável. Java 25 é o LTS corrente suportado pelo Boot 4.1.
- **Go 1.26** apenas nos **workers** (outbox dispatcher, sync Open Finance, matcher de conciliação) e no pix-sandbox (repo próprio).
- **NestJS** como BFF fino; **Next.js** no front.
- **Python/LangGraph** só na fase 2, isolado.
- Fronteira entre runtimes é **rede ou banco** (a tabela de outbox), nunca binding.

## Alternativas descartadas
- **Gateway em Go:** rejeitado — quarto runtime sem ganho; SCG já está no ecossistema do core.
- **Tudo em Java:** rejeitado — o dispatcher com SKIP LOCKED, backoff e alta concorrência é mais simples e leve em Go, e o Go já está em uso no pix-sandbox.

## Consequências
- Dois toolchains no CI (JVM + Go) e disciplina: o worker executa transições já decididas, **não decide regra de negócio**.
- O BFF não pode virar segundo backend: se precisar de regra, ela vai para o core.
