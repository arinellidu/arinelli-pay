---
name: Arinelli Pay
description: Cobrança multi-trilho como specimen tipográfico bitmap — papel newsprint, tinta rica, um acento sintético.
colors:
  paper: "#f5f3ec"
  paper-deep: "#ece9df"
  ink: "#0a0a0a"
  ink-soft: "#3d3b36"
  synth: "#00dc5a"
  synth-deep: "#00b249"
  stamp-paid: "#007a33"
  alarm: "#c42d10"
typography:
  display:
    fontFamily: "Handjet, monospace"
    fontSize: "4rem"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Handjet, monospace"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.01em"
  title:
    fontFamily: "Handjet, monospace"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "0.01em"
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    letterSpacing: "0.2em"
  data:
    fontFamily: "ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
components:
  button-action:
    backgroundColor: "{colors.synth}"
    textColor: "{colors.ink}"
    padding: "6px 12px"
  button-action-hover:
    backgroundColor: "{colors.synth-deep}"
    textColor: "{colors.ink}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "6px 12px"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-filter:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "8px 12px"
  button-filter-hover:
    backgroundColor: "{colors.ink-soft}"
    textColor: "{colors.paper}"
  chip-rail:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "2px 6px"
---

# Design System: Arinelli Pay

Verdade do código em `apps/web/src` (tokens em `app/globals.css` via Tailwind 4 `@theme`; contrato de direção no comentário de `app/layout.tsx`). Este arquivo documenta o que está construído — quem for estender (P08–P12: boleto, cartão, extrato, conciliação) estende ISTO, não inventa.

## Overview

**Creative North Star: "Emigre bitmap specimen"** (mundo escolhido pelo usuário, seed `ef1cd36a`).

Cobrança como página de specimen tipográfico: o dado de pagamento é a tipografia de catálogo. O valor da fatura é display bitmap gigante sobre papel newsprint; o estado é carimbo de almofada batido na diagonal; a única cor viva é um verde sintético reservado à ação. O mundo recusa explicitamente o dashboard da categoria (sidebar + cards de KPI) — as páginas são índices densos de catálogo, legíveis inteiros em uma tela, com o vocabulário do dinheiro brasileiro (fatura, trilho, vencimento, liquidação) como material de design.

Modo da superfície: **Operate**. Nada aqui é decoração de marketing — cada momento visual corresponde a um evento real do backend: o carimbo PAGA só cai quando o webhook liquida (I7), o bloco verde só pisca enquanto o polling de 3s está vivo. Luz única: `color-scheme: light`; não existe tema escuro.

**Key Characteristics:**
- Papel #F5F3EC + tinta #0A0A0A; UM acento sintético (#00DC5A) só em superfície de ação.
- Display bitmap Handjet 700 em degraus inteiros; texto em Public Sans; mono só para dado.
- Materiais de impressão: régua pontilhada, halftone, canto pixelado, carimbo com multiply.
- Zero sombras, zero border-radius, zero easing suave — movimento só em `steps()`.
- Ícones não existem: os glifos são tipográficos (×, ▲, ▼, ←, →, ✓, ·).

## Colors

Paleta de gráfica: dois papéis, duas tintas, um acento em par claro/escuro e duas tintas de carimbo para estado em texto.

### Primary
- **Verde Sintético** (`synth` #00DC5A): exclusivamente superfície de ação — fundo dos botões COBRAR VIA PIX e COPIAR CÓDIGO, `::selection`, e tarja de hover sobre texto (nav do masthead, links de cliente, nome no índice — o verde passa por cima como marca-texto).
- **Verde Sintético Profundo** (`synth-deep` #00B249): hover das superfícies synth e o bloco piscante de processo vivo (`blink-block`) — o único uso do acento em escala pequena, sempre como bloco sólido, nunca como texto.

### Secondary
Tintas de carimbo — mais escuras que o acento porque texto pequeno exige contraste 4.5:1 (comentário literal em `globals.css`):
- **Verde Carimbo** (`stamp-paid` #007A33): texto do carimbo PAGA e do estado LIQUIDADA no modal.
- **Vermelho Alarme** (`alarm` #C42D10): carimbo VENCIDA, mensagens de erro, hover do × de fechar.

### Neutral
- **Papel** (`paper` #F5F3EC): fundo da página e dos componentes; também é o "claro" do QR.
- **Papel Fundo** (`paper-deep` #ECE9DF): hover de linhas de tabela/lista, fundo do bloco EMV, hover do toggle inativo.
- **Tinta** (`ink` #0A0A0A): texto, todas as bordas, masthead e botão FILTRAR (fundos pretos), "escuro" do QR, outline de foco.
- **Tinta Suave** (`ink-soft` #3D3B36): texto secundário, notas, labels de filtro, carimbos neutros (CANCELADA/RASCUNHO), hover do botão FILTRAR.
- Opacidades de tinta são material, não cor nova: `ink/30` (divisórias internas de card), `ink/40` (bordas tracejadas de vazio, borda do bloco EMV), 45% via `color-mix` (régua pontilhada), `ink/70` (véu do modal).

### Named Rules
**A Regra do Acento Único.** O verde sintético existe só como superfície: fundo de botão de ação, seleção, tarja de hover, bloco vivo do polling. Nunca como cor de texto pequeno sobre papel — estado em texto usa as tintas de carimbo. Se um elemento novo "precisa" de cor, a resposta é tinta, papel ou carimbo; nunca um segundo acento.

## Typography

**Display Font:** Handjet 700 (via `next/font/google`, variável `--font-handjet`; fallback `monospace`)
**Body Font:** Public Sans 400/500/700 (variável `--font-public-sans`; fallback `system-ui, sans-serif`)
**Data Font:** pilha mono padrão do Tailwind (`font-mono`) — nenhuma fonte mono própria é carregada.

**Character:** bitmap de specimen contra grotesca administrativa. O Handjet só existe em 700, sempre via classe `.bitmap` (line-height 0.92, tracking +0.01em); o Public Sans faz todo o resto com `font-variant-numeric: tabular-nums` global no body.

### Hierarchy
A escada display usa os tokens `--text-step-*` — degraus inteiros, nunca tamanho intermediário:
- **Display** (`step-64` = 4rem/64px; sobe a 5rem/80px em ≥sm no h1 do SpecimenHeader): a palavra da página (FATURAS, CLIENTES) e o nome do cliente no detalhe.
- **Headline** (`step-48` = 3rem/48px): o valor em R$ nos cards de fatura e contrato — o dado-herói.
- **Title** (`step-32` = 2rem/32px): seções (CONTRATOS), nomes no índice de clientes, título de vazio (NADA POR AQUI).
- **step-24** (1.5rem/24px): marca ARINELLI PAY no masthead, título PIX e × do modal.
- **step-16** (1rem/16px): carimbo padrão, PÁG n/m, rodapé PIX · BOLETO · CARTÃO.
- **step-8** (0.5rem/8px): token definido; o eco final do SpecimenHeader usa `text-[8px]` — é o degrau da dissolução, nada funcional mora nele.
- **Body** (Public Sans 400/500, `text-sm`/0.875rem dominante; `text-xs` em notas e meta): texto corrido, notas ≤65ch.
- **Label** (Public Sans 700, 10–11px, tracking 0.14em–0.2em, UPPERCASE): labels de filtro, cabeçalhos de tabela, "FATURA 0001", PIX COPIA-E-COLA. Label nomeia dado ou controle — nunca decora heading (isso seria kicker, proibido).
- **Data** (`font-mono`, 10–14px): nº com `padStart(4, "0")`, valores em célula de tabela (alinhados à direita), CPF/CNPJ mascarado, EMV, endpoints em `<code>`.

### Named Rules
**A Regra do Degrau.** Display bitmap só nos degraus da escada (16/24/32/48/64, 80 no topo responsivo). Nunca tracking negativo — o bitmap respira com +0.01em.
**A Regra do Mono.** Mono é dado: identificador, valor tabular, documento, EMV, linha digitável. Nunca heading, nunca label, nunca texto corrido.

## Layout

Coluna única `max-w-6xl` (1152px) com `px-4` (`sm:px-6`); sem sidebar. Masthead preto full-bleed (`bg-ink text-paper`, marca bitmap step-24 + nav com tracking 0.12em) seguido de fita `halftone-fine` de 8px — a mesma fita fecha a página sobre o rodapé de `border-t-4`. Main com `py-8`.

Densidade Operate: o fluxo inteiro legível sem tutorial. Grades de cards: faturas 1/2/3 colunas (`sm`/`lg`), contratos 1/2, `gap-4`. O gesto nativo do mundo é o toggle **CARDS ⇄ TABELA** (bitmap alto ⇄ texto fino denso); todo estado de visão vive na querystring (`?view=`, filtros, `page`) — URLs são compartilháveis, o front não guarda estado de tela. Alinhamento por baseline (`items-baseline`) em masthead, headers e linhas de meta.

Sem filtro de status, a ordenação é acionável: VENCIDA primeiro, depois ABERTA por vencimento, PAGA/CANCELADA por último — o primeiro viewport carrega a urgência e a ação verde.

## Elevation & Depth

**Não existe sombra** — zero `box-shadow`/`shadow-*` no código. Profundidade é linguagem de prensa: peso de borda (1px chips e réguas · 2px moldura padrão · 4px pesado: separadores do masthead/rodapé, cabeça de tabela, painel do modal), fita de halftone nas bordas de página, régua pontilhada entre linhas, painel `paper-deep` para rebaixar dado bruto (EMV), e `mix-blend-mode: multiply` nos carimbos — tinta que se soma ao papel, não flutua sobre ele. O modal não "eleva": é um painel de `border-4` sobre véu `ink/70`.

### Named Rules
**A Regra da Prensa.** Profundidade por pressão de tinta (borda, retícula, sobreposição multiply), nunca por luz (sombra, glow, blur).

## Shapes

Raio zero absoluto — nenhum `border-radius` no app. Cantos são retos ou **pixelados**: `.px-corners` (clip-path de 12 pontos, entalhe de 4px) é a assinatura dos botões de ação. Formas do mundo, todas em `globals.css`:

- **Régua pontilhada** `.rule-dotted`: border-bottom 1px dotted, tinta a 45% — fecha o SpecimenHeader, separa linhas de tabela/lista e meta de card.
- **Halftone** `.halftone` (pontos 1px, grade 4px) e `.halftone-fine` (pontos 0.75px a 55%, grade 3px): fita de 8px nas bordas do shell e preenchimento do estado vazio. Material de superfície, nunca atrás de texto corrido.
- **Carimbo** `.stamp`: borda 3px `currentColor`, padding 0.1em/0.45em/0.2em, `rotate(-6deg)`, multiply — a cor vem toda de `text-*`.
- **Canto pixelado** `.px-corners`: só em botões (ação, contorno, FILTRAR, copiar). Molduras de card/modal ficam retas.
- **Sublinhado pontilhado** (`decoration-dotted`): todo link textual (cliente, limpar, ← clientes).
- **QR honesto** `.pixelated`: `image-rendering: pixelated`, canvas tinta-sobre-papel (#0A0A0A/#F5F3EC) com `border-2`.
- **Foco e seleção:** `:focus-visible` = outline 3px tinta, offset 1px; `::selection` = fundo synth.

## Motion

Só `steps()` — não há `transition`, `duration-*` ou curva de easing em lugar nenhum; hover troca de estado instantaneamente, como troca de chapa. Movimento é reservado a evento real do backend:

- **`stamp-in`** (240ms, `steps(3, end)`): chegada de carimbo em 3 quadros — 2.2× → 0.94× → 1×, rotação fixa em −6deg. Dispara quando a liquidação chega (modal PAGA, stamps com `animate`).
- **`block-blink`** (1s, `steps(1, end)`, infinito): bloco liga/desliga em passo único — o cursor de terminal do polling de 3s. Vive no ChargeChip PENDENTE e no "AGUARDANDO PAGAMENTO" do modal.

### Named Rules
**A Regra dos Quadros.** Se não dá para contar em ≤3 quadros, não se move. Nenhum fade, slide ou spring — e nenhuma animação decorativa: mover é afirmar que o sistema fez algo.

## Components

Todos em `apps/web/src/components/`.

### Buttons
Três receitas, todas UPPERCASE, `font-bold`, tracking 0.14–0.16em, `disabled:opacity-50`, sem radius:
- **Ação** (`px-corners bg-synth text-ink px-3 py-1.5 text-xs` → hover `bg-synth-deep`): a ação de dinheiro — COBRAR VIA PIX, COPIAR CÓDIGO (no modal, full-width e `text-sm`). Uma por fatura aberta; é o único verde da tela.
- **Contorno** (`px-corners border-2 border-ink bg-paper` → hover inverte para `bg-ink text-paper`): ação secundária — VER QR PIX, GERAR PRÓXIMA FATURA (`SubmitButton`, com `pendingLabel` tipo GERANDO…).
- **Filtro** (`px-corners bg-ink text-paper px-3 py-2` → hover `bg-ink-soft`): FILTRAR — submit de formulário GET.
- Ação terciária é link com sublinhado pontilhado ("limpar", "ver faturas deste cliente →").

### Chips
- **RailChip** (`status-stamp.tsx`): borda 1px tinta, 10px, peso 500, tracking 0.18em — PIX/BOLETO/CARD. A mesma receita (com bold) marca CPF/CNPJ nas páginas de cliente. Trilho é vocabulário: BOLETO e CARD já aparecem em chip/filtro mesmo antes de executar.
- **ChargeChip**: 11px `ink-soft`, "COBRANÇA " + CRIADA/PENDENTE/LIQUIDADA/FALHOU/DEVOLVIDA; quando PENDENTE, precede um quadrado 10px `bg-synth-deep` com `blink-block` — o sinal de vida.

### Cards / Containers
Specimen-card (`invoice-cards.tsx`, contratos em `clients/[id]/page.tsx`): moldura `border-2 border-ink bg-paper`; cabeçalho com divisória `border-ink/30` (label "FATURA 0001" 11px tracked + carimbo à direita); corpo com o valor em bitmap step-48 e linha de meta fechada por `rule-dotted` (vencimento à esquerda, RailChip à direita); rodapé com ChargeChip à esquerda e a ação à direita. Estado vazio: `border-2 border-dashed border-ink/40` + `halftone-fine`, título bitmap step-32 `ink-soft`, nota ≤48ch.

### Inputs / Fields
Filtros (`invoices/page.tsx`): label 10px 700 tracking 0.2em `ink-soft` empilhada sobre o controle; select/date `border-2 border-ink bg-paper px-2 py-1.5 text-xs`. Formulário GET puro — o estado cai na querystring. Foco é o global (outline 3px tinta). Erro de mutação: linha `text-xs text-alarm` sob o botão.

### Navigation
Masthead: links UPPERCASE `text-sm font-medium` tracking 0.12em, hover = tarja `bg-synth text-ink` (sem transição). **ViewToggle** (`view-toggle.tsx`): grupo `border-2 border-ink`, links `text-xs font-bold` tracking 0.16em; ativo `bg-ink text-paper` + `aria-current`, inativo hover `bg-paper-deep`. Paginação: links com `border-2` que invertem no hover (← ANTERIOR / PRÓXIMA →) ao redor de "PÁG n/m" em bitmap step-16.

### SpecimenHeader (assinatura do mundo)
`specimen-header.tsx` — a palavra da página repetida em degraus decrescentes (step-64/80 → step-32 `ink-soft` → step-16 a 70% → 8px a 50%, ecos `aria-hidden`), nota opcional ≤65ch `text-sm ink-soft`, fechado por `rule-dotted`. Toda página-índice abre com ele; o detalhe de cliente compõe o equivalente à mão (← link, nome em step-64, linha de meta, régua).

### InvoiceStamp (estado carimbado)
`status-stamp.tsx` — `.stamp` + cor por status + label PT-BR de `lib/format.ts`. Tamanhos: step-16 nos cards, `text-[13px]` na tabela. `animate` liga `stamp-in` (usar só quando o estado ACABOU de chegar do backend, não em render de lista).

### InvoicesTable
`invoices-table.tsx` (TanStack): cabeça `border-b-4 border-ink`, th-botões 11px 700 tracking 0.18em UPPERCASE com glifos ▲/▼; linhas `rule-dotted` com hover `paper-deep`; nº e valor em mono (valor à direita); ordenação client-side na página corrente, paginação vem da querystring (o front não decide página de dados).

### PixModal
`pix-charge.tsx` — véu `bg-ink/70`, painel `max-w-sm border-4 border-ink bg-paper`; cabeçalho `border-b-4`: PIX em bitmap step-24, centro = estado vivo (blink + AGUARDANDO PAGAMENTO) ou carimbo PAGA com `stamp-in`, × em bitmap com hover `alarm`; corpo: QR `pixelated`, nota, label PIX COPIA-E-COLA, EMV em `<code>` mono 10px sobre `paper-deep` (borda `ink/40`, `max-h-20`, `break-all`), botão verde full-width com feedback COPIADO ✓ (2s). Fecha por Esc e clique no véu.

### Estados do domínio (vocabulário fixo)
Labels em `lib/format.ts`; moeda `Intl` pt-BR BRL; datas dd/mm/aaaa; documentos mascarados (`documentMask`).
- **Fatura**: PAGA (`stamp-paid`) · ABERTA (`ink`) · VENCIDA (`alarm`) · CANCELADA/RASCUNHO (`ink-soft`). Contrato: ATIVO (`ink`) / ENCERRADO (`ink-soft/60`), mesmo `.stamp`.
- **Cobrança**: CRIADA → PENDENTE (blink-block + polling 3s) → LIQUIDADA; desvios FALHOU/DEVOLVIDA. PENDENTE é o único estado com movimento contínuo.
- **PAGA só nasce de evento**: o front faz polling e `router.refresh()`; nunca seta PAID por conta própria (I7). O `stamp-in` marca exatamente essa chegada.
- Ação de cobrança só é renderizada para ABERTA/VENCIDA sem pagamento; a Idempotency-Key nasce no client (uuid) e o replay devolve o resultado original (I1).

## Do's and Don'ts

### Do:
- **Do** reservar o verde synth (#00DC5A) para superfície de ação — um COBRAR por fatura aberta; hover/vida usam synth-deep (#00B249).
- **Do** usar bitmap só nos degraus (16/24/32/48/64/80) com tracking +0.01em e lh 0.92; dado gigante = step-48, palavra da página = step-64.
- **Do** dar profundidade por borda (1/2/4px), régua pontilhada, halftone e multiply.
- **Do** manter movimento em `steps()` amarrado a evento do backend (stamp-in = liquidou; blink = polling vivo).
- **Do** manter estado de tela na querystring (`?view=`, filtros, page) e labels do domínio em PT-BR fixo (PAGA/ABERTA/VENCIDA/CANCELADA; CRIADA/PENDENTE/LIQUIDADA).
- **Do** mascarar documento, tabular os números (`tabular-nums`), zero-padded nº (0001) em mono.

### Don't:
- **Don't** construir sidebar-dashboard, cards de KPI ou "visão geral" — as páginas são índices de specimen.
- **Don't** usar eyebrow/kicker sobre headings; label UPPERCASE tracked existe só nomeando dado ou controle.
- **Don't** usar mono fora de dado (nº, valor tabular, CPF/CNPJ, EMV, linha digitável, endpoint).
- **Don't** usar sombra, glow, blur ou border-radius — nenhum existe no código; não introduza o primeiro.
- **Don't** colocar o acento em texto pequeno sobre papel — texto de estado usa stamp-paid/alarm (4.5:1).
- **Don't** usar transição suave, fade ou spring; nenhuma animação decorativa.
- **Don't** simular estado no front (PAID sem webhook) nem importar biblioteca de ícones — glifos são tipográficos.
- **Don't** criar tema escuro (`color-scheme: light` é decisão) nem cor nova por trilho ou estado.

## Como estender (P08–P12)

- **Boleto:** linha digitável é dado → bloco `<code>` mono 10px sobre `paper-deep`, receita idêntica ao EMV; a ação continua sendo o único botão verde.
- **Cartão / novos trilhos:** ganham `RailChip` (BOLETO e CARD já existem como vocabulário) — nunca uma cor nova por trilho.
- **Extrato bancário:** tabela fina — linhas `rule-dotted`, hover `paper-deep`, valores mono à direita, cabeçalho 11px tracked; não vira grid de cards.
- **Conciliação:** match confirmado carimba com tinta `stamp-paid`; divergência usa `alarm`; processo rodando é `blink-block` + polling — chegada de resultado é `stamp-in`.
- Toda página nova abre com `SpecimenHeader` e fecha o primeiro bloco com `rule-dotted`; estados vazios usam a receita tracejada + halftone.
