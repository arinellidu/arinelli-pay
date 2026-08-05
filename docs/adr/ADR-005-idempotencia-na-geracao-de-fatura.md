# ADR-005 — Idempotência na geração de fatura

**Status:** Aceito · 2026-08-05

## Contexto
I1 nasceu escrito como "mutação de **pagamento** exige `Idempotency-Key`", e foi
implementado só em `POST /charges`: chave do front, unique `uq_charges_idem`, replay
devolvendo a cobrança original.

`POST /contracts/{id}/invoices:generate-next` ficou de fora e é igualmente perigoso. Ele
cria dinheiro a receber, e a regra que calcula o vencimento
(`DueDateRule.nextDueDate(hoje, billingDay, ultimoVencimento)`) usa como âncora a última
fatura não cancelada. Duas consequências:

- **Clique duplo / retry de rede.** A segunda chamada roda depois que a primeira já
  gravou, lê a âncora nova e gera a competência **seguinte** — o cliente termina com duas
  faturas em aberto, e a segunda com vencimento que ninguém pediu.
- **Duas abas, ou dois operadores.** Chamadas concorrentes leem a mesma âncora antes de
  qualquer commit e calculam o **mesmo** vencimento; sem trava, nascem duas faturas para a
  mesma competência.

São erros de naturezas diferentes: o primeiro é a mesma intenção repetida, o segundo são
intenções distintas colidindo. Uma trava só não cobre os dois.

## Decisão
**Duas travas no banco, e o header obrigatório na borda.**

| Trava | Erro que ela pega | O que a API devolve |
|---|---|---|
| `uq_invoices_idem` (unique em `idempotency_key`) | mesma intenção reenviada | `200` com a fatura original |
| `uq_invoices_contract_due` (unique parcial em `(contract_id, due_date)` com `status <> 'CANCELED'`) | intenções diferentes na mesma competência | `200` com a fatura que venceu o insert |

`Idempotency-Key` é obrigatório: sem ele, `400` — no gateway (`IdempotencyKeyGlobalFilter`,
que agora também guarda `/api/billing/contracts/*/invoices:generate-next`) e de novo no
core, para quem chamar o serviço direto.

**A chave nasce no render do formulário**, não no clique. A tela de contrato e a de cliente
emitem um `randomUUID()` em campo oculto; reenviar aquele formulário repete a chave. Só um
render novo — depois do `revalidatePath` — pede a próxima competência. Isso mantém o
princípio já usado em `PixChargeButton`: a chave pertence à **intenção do usuário**, e
nenhuma camada de servidor inventa uma.

O serviço não é `@Transactional` no método: o insert vai num `TransactionTemplate` e o
conflito é lido **depois** do rollback, senão a transação já estaria marcada como
rollback-only quando fôssemos buscar o vencedor. Mesmo desenho de `ChargeService`.

Conflito de competência responde `200` com a fatura existente, não `409`. O pedido era
"fature esta competência" e ela está faturada — o efeito desejado existe, e a tela só
precisa recarregar.

## Consequências
- Faturar a mesma competência de propósito (renegociação, correção de valor) passa a exigir
  cancelar a fatura anterior primeiro. O índice é parcial justamente para permitir isso;
  o endpoint de cancelamento ainda não existe e vira pré-requisito de quem for mexer nisso.
- A migration `0004` **falha** se a base já tiver duas faturas vivas na mesma competência.
  É o comportamento desejado: cobrança duplicada não se normaliza em silêncio.
- Linhas anteriores à migration recebem chave sintética `legacy-<id>` — elas não têm
  intenção registrada, e o que importa é que não colidam entre si.
- Cadastro (cliente, contrato, pessoa) segue **sem** exigir chave: lá o duplicado é barrado
  por unique de documento, que é o identificador natural. I1 vale onde não existe
  identificador natural do lado de fora.
- A geração ainda é explícita, disparada por gente. Quando existir scheduler de faturamento
  (o "sem scheduler" de hoje é decisão do P02), a chave natural dele deve ser
  `contrato + competência` — e `uq_invoices_contract_due` já é a rede que impede o job de
  faturar duas vezes o mesmo mês.
