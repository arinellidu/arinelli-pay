---
version: 1
slug: "apps-web"
primary_target: "apps/web"
related_targets: []
---

# Superfície: app web (apps/web — clientes, contratos, faturas e pessoas)

Modo: Operate. Visitante: avaliador técnico em demo de ~3min; persona emprestada: prestador brasileiro cobrando clientes recorrentes.

Tarefa: ler CPF/CNPJ → cliente → contrato → fatura, cobrar via Pix e ver a liquidação real chegar por polling sem reload.

Direção escolhida (2026-08-04, redesign): **Registro Executivo** — substitui o antigo “Instrumento de sinal”. Preto e grafite, cinza frio e ouro funcional; Archivo na linguagem e Azeret Mono apenas em dados. A composição aprovada A+B combina ledger horizontal de faturas com cadastro persistente de contratos.

Momento memorável: o diálogo Pix mantém QR e valor em foco; quando o webhook/outbox/worker confirma PAID, um selo Motion cai e uma única varredura WebGL dourada atravessa a tela. Fora do settlement, o canvas é transparente.

Gesto nativo: tabela é a leitura padrão; `?view=cards|table` preserva alternativa, filtros e paginação na querystring. No mobile, registros empilham e cinco destinos migram para navegação inferior fixa.

Restrições: PT-BR, BRL, dd/mm/aaaa; BOLETO/CARD só vocabulário; Idempotency-Key nasce no client; polling de 3s só para PENDING; PAGA nunca é simulado no front (I1/I7).

Não resolvido: boleto e cartão entram em P09/P10; a direção deve ser estendida sem criar uma cor ou animação por trilho.
