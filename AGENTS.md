# AGENTS.md — Arinelli Pay

Este arquivo se aplica a todo o repositório. Ele traduz o pipeline definido em
`CLAUDE.md` para um contrato operacional para agentes de código.

## 1. Leitura obrigatória antes de alterar código

Leia, nesta ordem:

1. `AGENTS.md` (este arquivo).
2. `CLAUDE.md` — âncora de arquitetura, stack fechada e invariantes I1–I8.
3. `PRODUCT.md` — público, posicionamento e promessa da demo.
4. `docs/DESIGN.md` — fluxo, fronteiras de runtime, estados e ADR seeds.
5. `CHANGELOG.md` — fonte de verdade sobre o que já foi implementado.
6. A seção aplicável de `docs/playbook/PROMPTS.md`.
7. ADRs, documentação de provider e arquivos locais da área alterada.

Não comece pela seção seguinte do playbook sem conferir o `CHANGELOG.md` e o
código. O playbook é a sequência histórica planejada; o repositório atual pode
ter evoluído, antecipado migrations ou refinado decisões.

## 2. Como interpretar o pipeline

- O pipeline original é P00 → P12, na ordem de `docs/playbook/PROMPTS.md`.
- Uma etapa completa equivale a uma unidade revisável: escopo fechado, testes,
  documentação, changelog e commit convencional.
- Não avance automaticamente para a etapa seguinte. Aguarde pedido explícito.
- Não refaça etapas já registradas no `CHANGELOG.md`.
- Um pedido pontual do usuário pode alterar uma área já entregue sem “abrir” a
  próxima etapa do playbook.
- Não amplie o escopo para itens futuros apenas porque estão descritos no
  playbook.
- Em ambiguidade que mude regra de negócio, contrato de API, schema, provider ou
  segurança, pare e peça direção.
- Antes de criar migration, liste `infra/migrations`. Use o próximo número real;
  nunca copie cegamente um número sugerido no playbook histórico.

## 3. Produto e prova técnica

Arinelli Pay é um SaaS brasileiro de cobrança multi-trilho com CRM mínimo:

`CPF/CNPJ → cliente → contrato → fatura → cobrança → liquidação`

O público primário é um avaliador técnico navegando a demo por cerca de três
minutos. A interface precisa demonstrar que o sistema é real:

- Uma fatura só aparece como paga após webhook verificado, outbox e worker.
- Pix executa hoje; boleto e cartão podem existir como vocabulário até suas
  etapas próprias, mas não devem fingir execução.
- Dados de demonstração são sintéticos e devem ser identificados como tal.
- Não invente clientes reais, depoimentos, métricas comerciais ou integrações
  não implementadas.
- Interface e conteúdo visível são em PT-BR; moeda é BRL e datas são
  `dd/mm/aaaa`.

## 4. Stack fechada

Não introduza outro runtime sem autorização explícita.

| Área | Tecnologia | Responsabilidade |
|---|---|---|
| `services/billing-core` | Java 25 + Spring Boot 4.1 | clientes, contratos, faturas e transações de billing |
| `services/payments-core` | Java 25 + Spring Boot 4.1 | cobranças, providers, webhooks e outbox |
| `services/gateway` | Spring Cloud Gateway | rotas, request id, idempotência no edge e rate limit |
| `services/workers` | Go 1.26 | dispatcher de outbox e tarefas concorrentes/I/O-bound |
| `apps/bff` | TypeScript + NestJS 11 | agregação e DTOs de tela, sem regra de negócio |
| `apps/web` | Next.js 16 + React 19 | App Router, Server Components e interação da UI |
| `infra/migrations` | PostgreSQL 17 + Flyway | único lugar que evolui o schema |
| Redis | Redis 8 | rate limit e infraestrutura efêmera |

Python/FastAPI pertence somente à fase 2 de IA e nunca entra no caminho de
decisão financeira.

## 5. Invariantes inegociáveis

### I1 — Idempotência total

- Toda mutação que cria dinheiro a receber exige `Idempotency-Key`: hoje
  `POST /charges` e `POST /contracts/{id}/invoices:generate-next`.
- A chave nasce no cliente chamador e atravessa gateway e BFF sem ser trocada.
- Replay retorna o resultado original — 200, nunca um segundo 201.
- Corridas são resolvidas por constraint unique no banco, não por memória local.
- Onde existe identificador natural do lado de fora (documento do cadastro), o
  unique dele já resolve e a chave não é exigida — ver ADR-005.

### I2 — Outbox

- Estado de domínio e evento de outbox são gravados na mesma transação.
- Chamadas externas não acontecem dentro dessa transação.
- Entrega e efeitos posteriores pertencem ao worker Go.

### I3 — Dinheiro exato

- Java: `BigDecimal`, escala 2 e `RoundingMode` explícito.
- SQL: `NUMERIC(14,2)`.
- Nunca use `double`/`float` para regra monetária.
- Integrações que usam centavos devem converter de modo explícito e testado.

### I4 — Providers atrás de ports

- Tipos HTTP, SDKs, credenciais e payloads específicos de PSP ficam em
  `adapters/`.
- O domínio depende de interfaces como `PixProvider`, nunca do provider.

### I5 — Webhook verificado ou descartado

- Valide assinatura sobre o corpo cru quando o provider exigir.
- Persista o payload recebido antes de processá-lo.
- Registre tentativas inválidas sem executar transição de estado.
- Deduplique por identificador estável do evento/provider.

### I6 — SQL-first

- Schema muda somente por migration Flyway versionada.
- JPA permanece com `ddl-auto=validate`.
- Não use `create`, `update`, auto-DDL ou correção manual de schema como solução.

### I7 — PAID somente por liquidação

- Front, BFF e endpoint comum não podem marcar fatura como `PAID`.
- A transição vem do evento `charge.settled` processado pelo pipeline de outbox.

### I8 — IA não decide

- Modelos podem produzir rascunhos e explicações.
- Código determinístico valida e executa qualquer ação.
- IA nunca aprova, liquida, concilia ou muda estado financeiro por conta própria.

## 6. Fronteiras arquiteturais

Fluxo de requisição:

`apps/web → apps/bff → services/gateway → cores Java`

Fluxo assíncrono:

`core Java → outbox_events → worker Go → estado derivado`

Regras por camada:

- Web: apresentação, estado de interação, querystring e polling controlado.
- BFF: validação de forma, adaptação, agregação e cache curto de leitura.
- Gateway: concerns de borda; nenhuma regra de billing.
- Cores Java: autoridade de domínio, validação de negócio e transações.
- Worker Go: consumo concorrente idempotente e integrações I/O-bound.
- PostgreSQL: constraints são parte do contrato, especialmente unique e checks.

O BFF nunca calcula vencimento, status, tarifa ou conciliação. O front nunca
simula sucesso que o backend ainda não confirmou.

## 7. Estados e terminologia

Use os nomes de domínio existentes:

- Invoice: `DRAFT → OPEN → PAID | OVERDUE | CANCELED`.
- Charge: `CREATED → PENDING → SETTLED | FAILED → REFUNDED`.
- Termos de UI: cliente, contrato, fatura, cobrança, trilho, vencimento e
  liquidação.

Não crie sinônimos que confundam contrato de API, logs e interface.

## 8. Estrutura do repositório

```text
apps/
  bff/                 NestJS, prefixo /bff
  web/                 Next.js App Router
services/
  billing-core/        domínio de billing
  payments-core/       cobranças, adapters e webhooks
  gateway/             Spring Cloud Gateway
  workers/             Go, outbox e jobs
infra/
  migrations/          migrations SQL ordenadas
docs/
  adr/                 decisões arquiteturais
  providers/           configuração e comportamento de PSPs
  playbook/PROMPTS.md   pipeline histórico P00–P12
```

Antes de editar uma área, procure instruções locais adicionais e leia testes
vizinhos. Preserve convenções já materializadas no código.

## 9. Portas locais

| Serviço | Porta |
|---|---:|
| Web | 3000 |
| BFF | 3001 |
| Gateway | 8090 |
| billing-core | 8081 |
| payments-core | 8082 |
| Worker health | 8083 |
| pix-sandbox | 8080 |
| PostgreSQL host | 5433 |
| Redis host | 6380 |

Não mate processos nem derrube containers que não foram iniciados pela tarefa
atual. Verifique os donos das portas antes de limpar uma stack local.

## 10. Versões e dependências

No início de uma etapa do playbook, confirme:

```bash
java -version
go version
node -v
```

Compare com `CLAUDE.md` e o anexo do playbook. Se houver divergência, reporte;
não faça downgrade silencioso.

Antes de importar uma biblioteca:

1. Verifique o manifesto e o lockfile da aplicação.
2. Prefira dependências já adotadas.
3. Confirme compatibilidade com as versões fechadas.
4. Não misture gerenciadores de pacote no mesmo app.
5. Alteração de framework/major version é trabalho separado e explícito.

Segredos, certificados e tokens entram somente por variáveis de ambiente. Nunca
grave credenciais em código, fixture, log, screenshot, GIF ou documentação.

## 11. Banco e migrations

- Leia todas as migrations existentes antes de criar outra.
- Migrations são incrementais e imutáveis depois de compartilhadas.
- Não renomeie nem reordene migrations aplicadas.
- Expresse invariantes também com `UNIQUE`, `CHECK`, FKs e tipos adequados.
- Teste com PostgreSQL real/Testcontainers quando a semântica depende do banco.
- Seeds devem ser sintéticos, idempotentes quando necessário e usar documentos
  válidos por dígito verificador.

## 12. Backend Java

- Controllers traduzem HTTP; services contêm casos de uso; repositories cuidam
  da persistência.
- Use `ProblemDetail` e códigos HTTP coerentes para erros de domínio.
- Evite N+1 em payloads de tela (`@EntityGraph`, fetch adequado ou projeção).
- Toda transição financeira precisa de teste de integração e teste de borda.
- Retry somente em falha transitória e fora de transações de domínio.
- Logs devem propagar `X-Request-Id` e não expor segredo ou payload sensível.

## 13. Workers Go

- Dispatcher usa transações curtas e `FOR UPDATE SKIP LOCKED`.
- Processamento precisa ser seguro com múltiplas instâncias.
- Use contexto, timeout, backoff, `slog` estruturado e graceful shutdown.
- Marque evento como processado somente depois do efeito confirmado.
- Teste concorrência, replay e falha parcial.

## 14. BFF NestJS

- Consuma somente o gateway, nunca os cores diretamente.
- Repassar `Idempotency-Key` é obrigatório; o BFF não inventa outra.
- DTOs são orientados à tela, mas não escondem decisões de negócio.
- Cache de leitura deve ser curto e nunca afetar polling de estado vivo.
- Erros upstream devem preservar status e informação útil, sem vazar segredo.

## 15. Front Next.js

- Server Components fazem leituras por padrão.
- Isole interatividade em Client Components pequenos.
- Estado navegável vive na querystring: filtros, paginação e modo card/tabela.
- Polling de 3 segundos só existe enquanto houver charge `PENDING`.
- Gere `Idempotency-Key` no client com UUID e mantenha a mesma chave em replay.
- Formate BRL e datas PT-BR usando utilitários compartilhados.
- Preserve estados loading, vazio, erro, sucesso, foco por teclado e reduced
  motion.
- Não introduza estado falso para deixar a demo “mais bonita”.
- Preserve o design system documentado em `docs/DESIGN.md` e os tokens de
  `apps/web/src/app/globals.css`.

Rotas existentes devem ser verificadas no código, não inferidas apenas do
playbook. Ao adicionar uma entidade navegável, atualize navegação, not-found,
links cruzados e estados vazios pertinentes.

## 16. Testes e verificação

Escolha verificações proporcionais ao risco e execute as relevantes:

```bash
# Toda a árvore Java
./mvnw verify

# Um módulo Java
./mvnw -pl services/billing-core test
./mvnw -pl services/payments-core test
./mvnw -pl services/gateway test

# Workers
go -C services/workers test ./...

# BFF
pnpm -C apps/bff test
pnpm -C apps/bff test:e2e
pnpm -C apps/bff build

# Web
pnpm -C apps/web lint
pnpm -C apps/web build
pnpm -C apps/web exec playwright test
```

Em Windows, use `mvnw.cmd`/`pnpm.cmd` quando necessário. Falha preexistente deve
ser separada claramente de regressão introduzida. Não declare “testes verdes”
se apenas parte da suíte foi executada.

Para mudanças de integração, prefira a stack real local e confirme healthchecks.
Para mudanças visuais, valide desktop e mobile. Para o ciclo de pagamento,
confirme que o `PAID` veio do webhook/outbox, não de fixture de front.

## 17. Demo do portfólio

- O GIF canônico é `docs/demo.gif` e aparece no `README.md`.
- O roteiro reexecutável é `apps/web/scripts/demo-gif.mjs`.
- A demo deve usar dados sintéticos e o pipeline real de liquidação.
- Não grave devtools, credenciais, certificados, tokens ou dados pessoais reais.
- Mantenha o artefato legível no GitHub e evite tamanho desnecessário.
- Ao mudar o fluxo principal, atualize roteiro, GIF e descrição do README em
  conjunto quando o pedido incluir a demo.

## 18. Git e disciplina de alterações

- Preserve alterações existentes do usuário e ignore arquivos fora do escopo.
- Nunca use `git reset --hard`, checkout destrutivo ou limpeza ampla.
- Revise `git status`, `git diff` e `git diff --check` antes da entrega.
- Não misture correções independentes no mesmo commit.
- Use Conventional Commits, por exemplo:
  - `feat(web): add contract management`
  - `fix(payments): preserve idempotency on replay`
  - `test(workers): cover concurrent outbox dispatch`
  - `docs: document provider setup`
- Só faça commit, push, PR ou publicação quando o usuário pedir ou quando a
  execução explícita de uma etapa completa do playbook incluir essa autorização.
- “1 prompt = 1 PR” define isolamento de trabalho; não autoriza publicar sozinho.

## 19. Documentação e encerramento

Uma etapa P00–P12 só está concluída quando houver:

- implementação dentro do escopo;
- invariantes relevantes preservados;
- build e testes aplicáveis executados;
- documentação/ADR/provider docs atualizados quando necessário;
- linha correspondente no `CHANGELOG.md`;
- arquivos alterados revisados;
- commit convencional, se autorizado;
- critérios de aceite da etapa demonstrados.

Para pedidos pontuais fora de uma etapa completa, atualize apenas a documentação
afetada e não fabrique uma entrada de changelog ou PR sem necessidade.

No relatório final, informe objetivamente:

1. resultado entregue;
2. arquivos principais;
3. verificações executadas e seus resultados;
4. limitações ou falhas preexistentes;
5. estado de commit/push, se aplicável.

## 20. Regra de conflito entre fontes

Quando documentos internos divergirem, use esta ordem prática:

1. pedido explícito atual do usuário;
2. invariantes I1–I8 e decisões aceitas em `docs/adr`;
3. código, migrations e testes já vigentes;
4. `CHANGELOG.md` como histórico entregue;
5. `CLAUDE.md` e `docs/DESIGN.md` como direção arquitetural;
6. `docs/playbook/PROMPTS.md` como plano histórico.

Não resolva divergência de negócio ou segurança sozinho. Registre a evidência e
peça decisão quando as opções produzirem comportamentos diferentes.
