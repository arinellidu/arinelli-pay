---
version: 1
slug: "apps-web"
primary_target: "apps/web"
related_targets: []
---

# Superfície: app web (apps/web — /clients, /clients/[id], /invoices)

Modo: Operate. Visitante: avaliador técnico em demo de ~3min; persona emprestada: prestador BR cobrando clientes.

Tarefa: ler carteira (clientes→contratos→faturas), cobrar via Pix, ver liquidação ao vivo (polling 3s) sem reload.

Direção escolhida (usuário, sobre o sorteio): **Specimen Bitmap Emigre** — papel newsprint + tinta rica + um acento sintético verde (#00DC5A); display bitmap (Handjet) em degraus inteiros; texto em grotesca fina (Public Sans); halftone/pontilhado como material; botões de canto pixelado; estado como carimbo diagonal. Momento memorável: modal do QR Pix — o QR é o specimen definitivo (pixel real com CRC real) e o carimbo PAGO cai sozinho quando o webhook liquida.

Gesto nativo: toggle ?view=cards|table = bitmap alto (cards specimen) ⇄ texto fino denso (tabela TanStack). Filtros/estado na querystring; Server Components na leitura; Idempotency-Key nasce no client (uuid).

Restrições: PT-BR, R$, dd/mm/aaaa; trilhos BOLETO/CARD só vocabulário; nunca simular estado no front (I7). Sem sidebar-dashboard da categoria; sem eyebrow/kicker; mono apenas para EMV/dados.

Não resolvido: GIF do README gravado no aceite; boleto/cartão entram P09/P10.
