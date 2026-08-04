---
name: Arinelli Pay
description: Registro executivo de cobrança — ledgers em grafite, vidro frio e ouro funcional reservado a decisões reais.
colors:
  chassis: "#080808"
  chassis-lift: "#151515"
  signal-gold: "#c5a461"
  signal-gold-deep: "#a88747"
  alert: "#f07867"
  warn: "#d8ad5c"
  read: "#f1f1ee"
  read-soft: "#b7b8b4"
  read-faint: "#777975"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 600
    letterSpacing: "0.18em"
  data:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    letterSpacing: "-0.025em"
rounded:
  control: "6px"
  panel: "8px"
  dialog: "12px"
spacing:
  tight: "8px"
  control: "12px"
  panel: "16px"
  section: "24px"
  page: "32px"
components:
  button-signal:
    backgroundColor: "{colors.signal-gold}"
    textColor: "#0a0907"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  button-signal-hover:
    backgroundColor: "{colors.signal-gold-deep}"
    textColor: "#0a0907"
  button-glass:
    backgroundColor: "rgba(216,217,214,0.06)"
    textColor: "{colors.read}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  badge-settled:
    backgroundColor: "rgba(197,164,97,0.12)"
    textColor: "{colors.signal-gold}"
    rounded: "{rounded.control}"
    padding: "0 8px"
---

# Design System: Arinelli Pay

## Overview

**Creative North Star: "Registro Executivo"**

Arinelli Pay se comporta como a mesa digital de uma câmara de compensação contemporânea: informação financeira em ledgers densos, decisões claras e acabamento preciso. O mundo é quase preto, de grafite e vidro frio; o ouro aparece apenas quando uma ação ou liquidação merece autoridade. A interface evita tanto o dashboard de cartões genéricos quanto o neon técnico permanente.

É uma superfície **Operate** para uma demo técnica curta. O avaliador deve entender clientes, contratos, faturas e liquidação sem tutorial. A composição A+B aprovada combina o registro horizontal de faturas com o cadastro persistente de contratos; no mobile, a mesma hierarquia vira registros empilhados e navegação inferior.

**Key Characteristics:**
- Ledgers horizontais e listas responsivas, não grades de KPIs.
- Preto e grafite como base; ouro funcional, nunca atmosfera contínua.
- Archivo para linguagem e Azeret Mono somente para dados.
- Vidro executivo discreto: separação fria, baixa saturação e sombra longa.
- Um único momento coreografado: a liquidação confirmada.

## Colors

A paleta é restrained: neutros frios sustentam alta densidade e um único metal quente confirma ação financeira e settlement.

### Primary
- **Ouro de confirmação**: ação financeira primária, navegação ativa, indicador vivo e estado liquidado. Sua raridade preserva autoridade.
- **Ouro profundo**: hover das superfícies douradas; nunca vira um segundo acento.

### Secondary
- **Alerta coral**: vencimento e falha que exigem recuperação.
- **Âmbar de atenção**: reservado a advertências não destrutivas.

### Neutral
- **Chassi**: fundo raiz e módulo escuro do QR.
- **Grafite elevado**: base de painéis densos, diálogos e formulário persistente.
- **Leitura**: texto principal e chapa clara do QR.
- **Leitura suave**: contexto, descrições e valores secundários.
- **Leitura fraca**: cabeçalhos de coluna, IDs, metadados e unidades.

### Named Rules

**The Functional Gold Rule.** Ouro marca decisão, atividade real ou liquidação; fora desses casos, use leitura neutra.

**The Cold Base Rule.** Superfícies permanecem pretas, grafite ou cinza frio em repouso. A varredura dourada nunca deixa resíduo ambiental.

## Typography

**Display Font:** Archivo (com system-ui)
**Body Font:** Archivo (com system-ui)
**Label/Mono Font:** Azeret Mono (com ui-monospace)

**Character:** uma grotesca editorial direta para operação, contraposta a uma mono rigorosa para registros. A diferença entre linguagem e dado cria hierarquia sem aumentar o número de cores.

### Hierarchy
- **Display** (600, responsivo até 3.75rem, line-height 0.96): títulos de página sem kicker.
- **Title** (600, 1.25rem, line-height 1.2): títulos de painel, modal e registro.
- **Body** (400, 0.875rem, line-height 1.6): explicação e contexto, com medida de até 72ch.
- **Label** (600, 0.625rem, tracking 0.18em, uppercase): coluna, campo e estado operacional.
- **Data** (400, 0.75rem, números tabulares): IDs, documentos, datas, valores e EMV.

### Named Rules

**The Ledger Type Rule.** Mono é dado verificável, nunca voz de marca ou corpo de texto.

**The Heading Rule.** O título carrega sua própria autoridade; não use eyebrow ou kicker acima dele.

## Layout

O shell usa uma coluna central de até 1440px com 16px no mobile, 24px a partir de tablet e 32px no desktop amplo. O masthead de 68px fica sticky; em telas menores que 768px a navegação principal vira uma barra inferior fixa e o conteúdo recebe espaço de segurança.

Faturas abrem como ledger horizontal de largura total, com filtros e toggle na querystring. Contratos usam duas regiões a partir de 1024px: ledger flexível e formulário persistente de 22–24rem; abaixo disso o formulário volta a diálogo e cada linha vira um registro empilhado. Clientes seguem a mesma gramática de lista, enquanto a visualização em painéis permanece uma alternativa explícita.

**The Registry Rule.** Uma coleção operacional começa como ledger/lista. Cards só entram como visualização alternativa ou registro móvel, nunca como estrutura padrão da página.

## Elevation & Depth

A profundidade é híbrida: camada tonal escura, reflexo frio superior e sombra longa com offset. O blur serve ao shell sticky e a painéis sobre a superfície estruturada; não cria halos nem substitui conteúdo. O formulário de contrato e o diálogo Pix recebem a receita mais densa; tabelas e listas usam o vidro mais baixo.

### Shadow Vocabulary
- **Vidro de registro**: reflexo inset superior e queda longa de baixa opacidade para listas, filtros e métricas.
- **Vidro profundo**: sombra mais extensa e base quase opaca para diálogo e formulário persistente.
- **Tecla dourada**: reflexo inset curto e queda dourada contida apenas na ação primária.

### Named Rules

**The Quiet Glass Rule.** Vidro separa níveis operacionais; se o efeito chama mais atenção que os dados, está forte demais.

## Shapes

Controles usam cantos firmes de 6px; painéis e ledgers, 8px; diálogos, 12px. Badges são retângulos compactos, nunca pílulas. Bordas são hairlines frias; um registro pendente pode receber uma aresta dourada de exatamente 1px. O QR é a única chapa clara do produto.

## Components

### Buttons
- **Primary:** tecla dourada de 36px, texto escuro, uppercase e ícone Lucide quando necessário. Aparece em criar contrato, cobrar via Pix e copiar código.
- **Secondary:** vidro frio com texto claro; serve filtros, toggle, tentativa e abertura de diálogos.
- **Hover / Focus:** ouro aprofunda no primário; o secundário ganha borda dourada discreta. Foco sempre usa outline dourado de 2px com offset de 3px.

### Badges
- **PAGA / LIQUIDADA:** ouro sobre banho dourado contido.
- **VENCIDA / erro:** coral.
- **ABERTA / ATIVO / trilho:** contorno neutro.
- Todos usam Azeret Mono, tracking alto e forma retangular.

### Cards / Containers
- **Ledger:** superfície de vidro baixo, cabeça fria, hairlines internas e hover tonal.
- **Registro móvel:** os mesmos campos do ledger em sequência vertical; não omite ID, documento, valor ou status.
- **Readout strip:** duas ou mais leituras em painel compacto, alinhadas ao título no desktop.

### Inputs / Fields
- Fundo frio translúcido, borda de input e raio de 6px.
- Labels mono em uppercase; ajuda em leitura suave.
- Foco muda a borda para ouro; erro muda para coral e nomeia a recuperação.

### Navigation
- Marca “A” em moldura quadrada e wordmark ARINELLI / PAY REGISTRY.
- Desktop: links compactos no masthead com hairline dourada no ativo.
- Mobile: cinco destinos com ícones Lucide e rótulos curtos em barra inferior.

### Settlement
- O polling de 3s permanece ativo somente para cobrança PENDING.
- A chegada real do PAID aciona selo Motion no diálogo e uma única varredura WebGL dourada de 1.1s.
- Fora do settlement, o canvas é totalmente transparente. Reduced motion remove a varredura.

## Do's and Don'ts

### Do:
- **Do** priorizar ledger, ordenação, filtros e ação visível em superfícies operacionais.
- **Do** usar ouro somente em ação financeira, atividade real e settlement.
- **Do** manter toda medição em Azeret Mono com números tabulares.
- **Do** preservar querystring, foco, estados vazios/erro e navegação móvel.
- **Do** amarrar PAGA ao webhook, outbox e worker; movimento acompanha esse fato.

### Don't:
- **Don't** adicionar kicker acima de headings, gradiente em texto ou faixa de KPIs.
- **Don't** usar glow/neon, ouro como wallpaper ou WebGL em repouso.
- **Don't** transformar cada entidade em card do mesmo tamanho.
- **Don't** usar mono como fantasia técnica nem badge em formato de pílula.
- **Don't** criar cor por trilho ou simular estado financeiro no front.
