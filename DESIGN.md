---
name: Arinelli Pay
description: Cobrança lida como instrumento de sinal — chassi escuro sob campo de fósforo WebGL, painéis de vidro de cobertura, um acento de fósforo.
colors:
  chassis: "#07090b"
  chassis-lift: "#0d1114"
  signal: "#00dc5a"
  signal-deep: "#00b249"
  alert: "#ff6242"
  warn: "#f2a93b"
  read: "#e9eeeb"
  read-soft: "#9aa5a0"
  read-faint: "#656f6a"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "4rem"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "2.5rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 400
    letterSpacing: "0.2em"
  data:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    letterSpacing: "-0.02em"
components:
  button-signal:
    backgroundColor: "{colors.signal}"
    textColor: "#04150b"
    padding: "0 10px"
    borderRadius: "8px"
  button-signal-hover:
    backgroundColor: "{colors.signal-deep}"
    textColor: "#04150b"
  button-glass:
    backgroundColor: "rgba(255,255,255,0.06)"
    textColor: "{colors.read}"
    padding: "0 10px"
    borderRadius: "8px"
  button-glass-hover:
    backgroundColor: "rgba(255,255,255,0.12)"
    textColor: "{colors.read}"
  badge-signal:
    backgroundColor: "rgba(0,220,90,0.12)"
    textColor: "{colors.signal}"
    padding: "0 8px"
    borderRadius: "5px"
  badge-alert:
    backgroundColor: "rgba(255,98,66,0.12)"
    textColor: "{colors.alert}"
    padding: "0 8px"
    borderRadius: "5px"
---

# Design System: Arinelli Pay

Verdade do código em `apps/web/src` (tokens em `app/globals.css` via Tailwind 4 `@theme` e `@utility`; contrato de direção no comentário HTML de `app/layout.tsx`). Este arquivo documenta o que está construído — quem for estender (P08–P12: boleto, cartão, extrato, conciliação) estende ISTO.

## Overview

**Creative North Star: "Instrumento de sinal"** — direção pinada pelo brief do usuário (Tailwind v4 + shadcn/ui + Framer Motion + WebGL + glassmorphism), rendida como aparelho de medição em vez de painel de vidro genérico.

A tela é a face de um instrumento: um chassi quase preto, um campo de fósforo desenhado em WebGL atrás de tudo, e painéis de **vidro de cobertura** por onde se lê a medição. O vidro só existe porque há sinal atrás para refratar — em fundo chapado ele seria decoração. O campo não é wallpaper: sua amplitude sobe enquanto existe cobrança pendente, cada batida do polling de 3s acende um pulso, e a liquidação confirmada varre a tela uma vez. Movimento é sempre consequência de evento real do backend (I7).

Modo da superfície: **Operate**. Densidade e legibilidade vencem expressão; a marca vive na precisão dos detalhes.

**Key Characteristics:**
- Chassi #07090B; UM acento de fósforo (#00DC5A) que, no escuro, pode ser texto.
- Interface em Archivo; **toda medição em Azeret Mono** (valores, nº, documento, datas de tabela, EMV).
- Profundidade por luz: blur, aresta de 1px, aro de sombra — não por peso de borda.
- Ícones desenhados (lucide, traço único). Nenhum glifo Unicode fazendo papel de ícone.
- Um único momento coreografado: a chegada da liquidação.

## Colors

Estratégia: **Restrained** — chassi + leituras neutras + um acento. O escuro não é preferência de categoria: a cena é um avaliador técnico lendo um painel luminoso, e o vidro precisa de algo brilhante atrás.

### Primary
- **Fósforo** (`signal` #00DC5A): superfície da ação de dinheiro (`Cobrar via Pix`, `Copiar código`), estado LIQUIDADA/PAGA em texto, lâmpada de atividade, item de nav ativo, foco. Sobre o chassi rende ~11:1 — por isso aqui ele pode ser texto pequeno, ao contrário de um fundo claro.
- **Fósforo profundo** (`signal-deep` #00B249): hover das superfícies de fósforo.

### Secondary
- **Alerta** (`alert` #FF6242): fatura VENCIDA, erro de mutação, falha de rota. Calibrado mais claro que o vermelho antigo porque vive sobre chassi.
- **Âmbar** (`warn` #F2A93B): token reservado; ainda sem uso — não invente um segundo acento no lugar dele.

### Neutral
- **Chassi** (`chassis` #07090B): fundo do `<html>` e claro do QR invertido. **O `<body>` não pode ter fundo** — o canvas do campo vive em `z-index:-10` e a ordem de pintura do stacking context raiz faria o fundo do body cobri-lo.
- **Chassi elevado** (`chassis-lift` #0D1114): token de superfície opaca.
- **Leitura** (`read` #E9EEEB): texto principal; também é a chapa clara do QR.
- **Leitura suave** (`read-soft` #9AA5A0): texto secundário, nota da página, contrato na tabela.
- **Leitura fraca** (`read-faint` #656F6A): rótulos miúdos, meta de card, unidade `R$`.
- Opacidades de branco são material, não cor nova: `white/4` (cabeça de tabela, campo de formulário), `white/6` (divisórias internas, hover), `white/8–/12` (bordas de painel), `white/14` (aba ativa do toggle).

### Named Rules
**A Regra do Fósforo.** Um acento só. Ele marca ação de dinheiro, atividade viva e liquidação — nada mais. Estado que não é liquidação usa leitura neutra (ABERTA) ou alerta (VENCIDA). Um trilho novo não ganha cor: ganha etiqueta.

## Typography

**Interface:** Archivo variável (`next/font/google`, `--font-archivo`).
**Medição:** Azeret Mono variável (`--font-azeret`), exposto como `font-mono` e pela utility `.readout` (mono + `tabular-nums` + tracking −0.02em).

**Character:** grotesca industrial contra mono técnico. O Archivo carrega o título de página em caixa alta grande; o Azeret Mono carrega tudo que é medida — e é ele que dá o ar de mostrador.

### Hierarchy
- **Título de página**: `clamp(2.5rem, 7vw, 4rem)`, 600, lh 0.95, tracking −0.02em, UPPERCASE.
- **Nome do cliente (detalhe)**: `clamp(2rem, 5.5vw, 3.25rem)`, 600, tracking −0.025em, caixa normal.
- **Valor-herói**: `.readout` 2.5rem (modal) / 2rem (cards), peso 500.
- **Seção**: 1.25rem, 600 (Contratos). **Vazio/erro**: 1.5rem, 600.
- **Corpo**: 0.875rem, lh 1.6, medida ≤68ch.
- **Rótulo**: `.readout` 10–11px, tracking 0.16–0.2em, UPPERCASE — nomeia dado ou controle.
- **Dado**: `.readout` 11–14px.

### Named Rules
**A Regra do Mostrador.** Mono é medição: valor, nº zero-padded, CPF/CNPJ, vencimento em tabela, EMV, rótulo de leitura. Nunca corpo de texto, nunca título de página.
**A Regra da Unidade.** Valor em dinheiro renderiza por `<Money>`: `R$` a 0.5em em `read-faint`, magnitude em tamanho cheio, `aria-label` com o valor completo. A escala não compete com a medição.

## Layout

Coluna única `max-w-6xl` (1152px), `px-4`/`sm:px-6`, `main` com `py-10`. Masthead **fixo no topo** (`sticky`) em vidro: é a lente que passa por cima do campo enquanto a página rola — o gesto que prova que o fundo é ao vivo. Rodapé separado por `border-t border-white/8`.

Cabeçalho de página (`page-header.tsx`): título + **régua de leituras** (`ReadoutStrip`) alinhados pela base em ≥sm; no mobile a ordem vira título → nota → régua. Fecha com hairline. A régua carrega estado do instrumento (nesta página, cobranças vivas) — **nunca uma faixa de KPIs**.

Grades: faturas 1/2/3 colunas, contratos 1/2, `gap-4`. Índice de clientes é **uma lista dentro de um único painel**, não N cards. Todo estado de tela vive na querystring (`?view=`, filtros, `page`).

Sem filtro de status, a ordenação é acionável: vencidas, depois abertas por vencimento, pagas/canceladas por último.

## Elevation & Depth

Profundidade é ótica, não tipográfica. Duas receitas em `globals.css`:

- **`.glass`** (painéis, régua de filtros, toggle, listas, tabela): gradiente branco 8%→2% **sobre base `rgb(7 9 11 / 62%)`**, `backdrop-filter: blur(20px) saturate(1.4)`, borda `white/9`, e três sombras — aresta de luz `inset 0 1px 0 white/14`, aro `inset 0 -1px 0 black/35` e queda `0 18px 40px -26px black/90`. A base escura é obrigatória: sem ela a banda de fósforo atravessa o painel e o texto perde contraste exatamente onde o sinal é mais forte.
- **`.glass-deep`** (o painel de cobrança): gradiente opaco #161B1F→#0C1013, `blur(28px) saturate(1.5)`, aro mais duro, queda `0 40px 90px -30px`.
- **`.edge-signal`**: substitui a aresta por fósforo enquanto a cobrança daquele painel está PENDENTE.
- Véu do modal: `bg-chassis/72` + `backdrop-blur-md` — escuro o bastante para o painel ser a única coisa em foco.

### Named Rules
**A Regra da Lente.** Vidro só onde há sinal atrás. Todo `backdrop-blur` novo precisa de algo estruturado por trás; blur sobre superfície chapada é decoração e não entra.

## Shapes

Raios de painel de instrumento: `--radius-md: 8px`, `lg: 10px`, `xl: 14px`. Painéis e diálogos usam `rounded-xl`; botões e campos `rounded-lg`; etiquetas de estado `rounded-[5px]` — **nunca pílula**. QR sai numa chapa `bg-read` com `rounded-lg` e sombra própria: a única superfície de papel do aparelho, com módulos #07090B sobre #E9EEEB para leitor real.

Foco: `outline: 2px solid var(--color-signal)`, offset 2px. Seleção: fundo fósforo, texto #04150B.

## Motion

Três fontes, todas amarradas a evento:

- **Campo WebGL** (`signal-field.tsx`): fragment shader em WebGL2 num triângulo de tela cheia (sem buffers, `gl_VertexID`). Duas ondas somadas formam a linha de base; `u_pending` sobe amplitude e brilho, `u_pulse` acende a cada resposta do polling, `u_settle` varre a diagonal em 1.1s. Piso de ruído por hash. DPR travado em 1.5; **15fps em repouso**, 60 quando há atividade; pausa em `document.hidden`; `prefers-reduced-motion` desenha um quadro estático. Sem WebGL2 o chassi do `<html>` já garante a tela legível.
- **Lâmpada** (`.lamp`, 1.6s ease-in-out): o único loop de CSS, e só enquanto o polling está de pé.
- **Selo de liquidação** (Framer Motion, `motion/react`): spring (stiffness 400, damping 24) trazendo o selo PAGA de `scale .72 + blur 8px`, com um anel expandindo em `cubic-bezier(.16,1,.3,1)`; o valor transiciona para fósforo em 0.5s na mesma curva.

### Named Rules
**A Regra do Evento.** Um único momento coreografado — a chegada da liquidação. Fora dele, transições são de estado (hover, foco) e o campo é piso de ruído. Nenhuma animação de entrada em seção, nenhum efeito decorativo.
**A Regra do Painel Aberto.** Se a fatura liquida com o painel aberto, o `router.refresh()` **espera o fechamento** (`deferredRefresh`): sem isso a lista filtrada some com o card e mata o selo no meio do momento.

## Components

shadcn/ui (estilo `base-nova`, sobre `@base-ui/react`) é o substrato em `components/ui/`: `button`, `badge`, `dialog`, `select`, `separator`. Os átomos foram comprometidos com o mundo — `buttonVariants` ganhou `signal` e `glass`; `badgeVariants` ganhou `signal`/`alert`/`neutral` e virou retângulo mono; `DialogOverlay` virou o véu do chassi.

### Buttons
- **`variant="signal"`**: a ação de dinheiro. Fósforo, `inset 0 1px 0 white/35` (luz de tecla) + queda de fósforo, caixa alta tracking 0.08em. Uma por fatura cobrável.
- **`variant="glass"`**: ação secundária no material dos painéis — Ver QR Pix, Filtrar, Gerar próxima fatura, Tentar de novo.
- Ação terciária é link sublinhado (`decoration-white/20`, hover fósforo).

### Badges / etiquetas
- **`InvoiceStatus`**: PAGA = `signal`, VENCIDA = `alert`, ABERTA = `outline` com borda `white/18` (leitura neutra — o fósforo fica com quem liquidou), CANCELADA/RASCUNHO = `neutral`.
- **`RailBadge`**: contorno neutro. PIX/BOLETO/CARD; boleto e cartão já são vocabulário antes de executar.
- **`ContractStatus`**: Ativo (contorno) / Encerrado (neutral).
- **`Lamp`**: `live` respira, `on` fica acesa com halo, `off` é piloto apagado.
- **`ChargeState`**: lâmpada + CRIADA/PENDENTE/LIQUIDADA/FALHOU/DEVOLVIDA; LIQUIDADA em fósforo.

### Painéis de fatura (`invoice-cards.tsx`)
`.glass rounded-xl` em coluna: cabeça (nº em `.readout` + etiqueta de estado) sobre `border-white/8`; corpo com contrato, link do cliente, `<Money>` 2rem e linha de meta (vencimento + RailBadge); rodapé `min-h-[3.25rem]` com ChargeState à esquerda e a ação à direita. Cobrança PENDENTE liga `.edge-signal`.

### Tabela (`invoices-table.tsx`)
TanStack dentro de um `.glass rounded-xl overflow-hidden`. Cabeça `bg-white/4` com `border-b border-white/12`; th-botões `.readout` 10px tracking 0.18em com `ChevronUp`/`ChevronDown`/`ChevronsUpDown` (a coluna VALOR inverte a ordem ícone/rótulo por ser alinhada à direita), `scope="col"` e `aria-sort`. Linhas `border-white/6`, hover `white/4`. Ordenação client-side na página corrente; paginação vem da querystring.

### Filtros (`invoice-filters.tsx`)
Barra `.glass` que continua sendo **GET nativo** — o estado cai na querystring e o servidor rende a página já filtrada. `Select` do shadcn com `name` (Base UI emite input escondido) e `items` para resolver rótulo; datas em `<input type="date">` nativo (o `color-scheme: dark` faz o seletor do browser acompanhar). Em `<sm` o formulário vive dentro do **FilterFold**: botão de vidro `Filtros` com `aria-expanded`, fechado por padrão.

### Painel de cobrança (`pix-charge.tsx`)
`Dialog` do shadcn com `glass-deep`, `max-h-[92dvh]`, `overflow-x-hidden` (o anel do selo escapa da caixa durante a animação). Cabeça: título `Cobrança Pix` + região `role="status"` com lâmpada e AGUARDANDO PAGAMENTO / LIQUIDADA; empilha no mobile. Corpo: rótulo `Fatura NNNN · Cliente`, `<Money>` 2.5rem com o selo PAGA caindo ao lado, QR na chapa clara, nota, EMV em `<code>` sobre `bg-black/35`, e o botão de fósforo full-width com feedback `Código copiado` (2s) + `role="status"` invisível.
**O QR é pintado por ref de callback, não por efeito** — o popup do Base UI só entra no DOM depois da transição de abertura, e um `useEffect` rodaria com o canvas ainda nulo.

### Masthead / navegação
Barra fixa em vidro (receita inline, sem `.glass`, para não brigar com a borda). Marca desenhada: onda dentro de um aro arredondado, `currentColor` em fósforo. Nav em caixa alta com sublinhado de fósforo no item ativo (`aria-current`). **ViewToggle**: grupo `.glass` com `LayoutGrid`/`Rows3`; ativo `bg-white/14` com aresta de luz.

### Estados de sistema
`loading.tsx` (lâmpada + "Lendo o sistema", `role="status"`), `error.tsx` ("Sem sinal do BFF" em alerta, mensagem em `.readout` sobre `bg-black/35`, botão de vidro Tentar de novo), `not-found.tsx` ("Fora de escala"). Vazios de listagem usam painel `.glass` com título 1.5rem e nota ≤52ch; filtro de trilho futuro vira "Trilho em preparo" afirmando o roadmap.

### Estados do domínio (vocabulário fixo)
Labels em `lib/format.ts`; moeda `Intl` pt-BR BRL; datas dd/mm/aaaa; documentos mascarados.
- **Fatura**: PAGA · ABERTA · VENCIDA · CANCELADA/RASCUNHO.
- **Cobrança**: CRIADA → PENDENTE (lâmpada + polling 3s) → LIQUIDADA; desvios FALHOU/DEVOLVIDA.
- **PAGA só nasce de evento**: o front faz polling e `router.refresh()`; nunca seta PAID por conta própria (I7). A Idempotency-Key nasce no client (uuid) e o replay devolve o resultado original (I1).

## Barramento de sinal (`lib/signal.ts`)

`holdPending()` (devolve release), `announcePoll()`, `announceSettlement()`, `subscribeSignal()`. São `CustomEvent`s em `window` — sem provider, sem contexto. É o contrato entre o que o backend responde e o que o campo desenha; qualquer trilho novo (boleto, cartão) deve emitir os mesmos três sinais em vez de inventar animação própria.

## Do's and Don'ts

### Do:
- **Do** reservar o fósforo para ação de dinheiro, atividade viva e liquidação.
- **Do** passar toda medição por `.readout` / `<Money>` e manter `tabular-nums`.
- **Do** dar profundidade por blur + aresta de luz + aro de sombra, com base escura sob o vidro.
- **Do** amarrar movimento a evento: `holdPending` / `announcePoll` / `announceSettlement`.
- **Do** manter estado de tela na querystring e o formulário de filtros como GET nativo.
- **Do** usar ícones lucide em traço único; se faltar um, desenhe SVG na mesma gramática.

### Don't:
- **Don't** dar fundo ao `<body>` — o campo WebGL fica atrás dele e some.
- **Don't** usar blur onde não há sinal atrás; vidro decorativo não entra.
- **Don't** construir sidebar-dashboard, faixa de KPIs ou "visão geral" — a régua de leituras mostra estado do instrumento, não métricas de negócio.
- **Don't** usar eyebrow/kicker sobre heading, nem gradiente em texto.
- **Don't** usar mono fora de medição, nem etiqueta em formato de pílula.
- **Don't** adicionar animação de entrada por seção; o único momento coreografado é a liquidação.
- **Don't** simular estado no front (PAID sem webhook) nem criar cor nova por trilho ou estado.
- **Don't** criar tema claro: `color-scheme: dark` é decisão — o vidro depende do campo luminoso.

## Como estender (P08–P12)

- **Boleto:** linha digitável é medição → `<code>` `.readout` sobre `bg-black/35`, receita idêntica ao EMV; a ação continua sendo o único botão de fósforo.
- **Cartão / novos trilhos:** ganham `RailBadge` e emitem os sinais do barramento — nunca uma cor nova.
- **Extrato bancário:** tabela fina dentro de um `.glass`, valores em `<Money>` à direita, cabeça `bg-white/4`; não vira grade de cards.
- **Conciliação:** match confirmado carimba em fósforo; divergência em alerta; processo rodando é `holdPending` + lâmpada, e o resultado chega por `announceSettlement`.
- Toda página nova abre com `PageHeader` e usa a receita `.glass` para vazios.
