# ADR-002 — SQL-first com Flyway; JPA só valida

**Status:** Aceito · 2026-08-01 (formaliza o seed nº 2 do DESIGN.md, praticado desde o P00)

## Contexto
Dois serviços Java (billing-core, payments-core) e workers Go compartilham o mesmo Postgres. O schema é contrato entre três runtimes — não pode ser efeito colateral de um ORM.

## Decisão
- Schema muda SOMENTE por migration versionada em `infra/migrations` (convenção `NNNN_nome.sql`, Flyway com prefixo vazio e separador `_`).
- Quem aplica migrations em runtime é o billing-core; payments-core usa Flyway apenas em escopo de teste (Testcontainers).
- JPA roda com `ddl-auto=validate` em todos os serviços: Hibernate nunca gera DDL (I6).
- Dinheiro: `NUMERIC(14,2)` no banco, `BigDecimal` no Java com `RoundingMode` explícito (I3).

## Consequências
- Toda mudança de schema passa por PR legível (SQL puro) e vale para Java e Go ao mesmo tempo.
- Divergência entidade×schema explode no boot (validate), não em produção silenciosamente.
