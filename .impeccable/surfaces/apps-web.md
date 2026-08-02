---
version: 1
slug: "apps-web"
primary_target: "apps/web"
related_targets: []
---

# Superfície: app web (apps/web — /clients, /clients/[id], /invoices)

Modo: Operate. Visitante: avaliador técnico em demo de ~3min; persona emprestada: prestador BR cobrando clientes.

Tarefa: ler carteira (clientes→contratos→faturas), cobrar via Pix, ver liquidação ao vivo (polling 3s) sem reload.

Direção escolhida (2026-08-02, redesign): **Instrumento de sinal** — o mundo anterior (specimen bitmap Emigre, papel/tinta) foi substituído a pedido do usuário. Chassi escuro sob campo de fósforo em WebGL, painéis de vidro de cobertura, um acento de fósforo #00DC5A; Archivo na interface e Azeret Mono em toda medição; shadcn/ui (base-nova) como substrato de componente; Framer Motion só no momento da liquidação.

Momento memorável: o painel de cobrança — QR real, e quando o webhook liquida o selo PAGA cai com spring enquanto uma varredura de fósforo atravessa a tela inteira.

Regra que nasceu do build: o campo WebGL é acionado por eventos reais via `lib/signal.ts` (`holdPending` / `announcePoll` / `announceSettlement`). Nenhum trilho novo inventa animação própria — emite os mesmos três sinais.

Gesto nativo: toggle ?view=cards|table (painéis de vidro ⇄ tabela densa). Filtros/estado na querystring com GET nativo; Server Components na leitura; Idempotency-Key nasce no client (uuid).

Restrições: PT-BR, R$, dd/mm/aaaa; trilhos BOLETO/CARD só vocabulário; nunca simular estado no front (I7); `<body>` não pode ter fundo (o canvas do campo fica em z-index -10).

Não resolvido: o GIF do README ainda está gravado no mundo antigo (specimen bitmap) — precisa ser regravado. Boleto/cartão entram P09/P10.
