// Grava o fluxo de portfólio completo pela interface:
// pessoa cadastrada → correção na própria linha → cliente → contrato → fatura →
// Pix → webhook → PAGA.
//
// A pessoa sintética nasce pela API porque o foco do filme é o que vem depois:
// a edição in-place do cadastro e o ciclo de cobrança. Cliente, contrato, fatura
// e cobrança nascem pela própria UI.
// Uso: `node scripts/demo-gif.mjs <dir-de-saida>` com a stack local completa.
import { chromium } from "playwright";
import { createHmac } from "node:crypto";

const outDir = process.argv[2] ?? ".";
const BFF = process.env.BFF_URL ?? "http://localhost:3001";
const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const GATEWAY = process.env.GATEWAY_URL ?? "http://localhost:8090";
const PAYMENTS = process.env.PAYMENTS_URL ?? "http://localhost:8082";
const secret = process.env.WEBHOOK_HMAC_SECRET ?? "change-me";

function generateValidCpf() {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (new Set(digits).size === 1) digits[0] = (digits[0] + 1) % 10;
  for (const length of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += digits[i] * (length + 1 - i);
    const remainder = (sum * 10) % 11;
    digits.push(remainder === 10 ? 0 : remainder);
  }
  return digits.join("");
}

/** Mesma máscara da tela: o filme procura a linha pelo documento formatado. */
function cpfMask(cpf) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

async function post(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`${url} respondeu ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

const stamp = Date.now().toString().slice(-6);
const cpf = generateValidCpf();
const personName = "Marina Costa Ferreira";
const contractTitle = "Direção criativa mensal";
const novoTelefone = "11944223310";

const person = await post(`${BFF}/bff/people/pf`, {
  nome: personName,
  cpf,
  email: `marina.ferreira${stamp}@costastudio.com.br`,
  // o telefone entra errado de propósito: a correção acontece no filme, na
  // própria linha da lista, e volta persistida do billing-core
  telefone: "1133224400",
  cidade: "São Paulo",
  uf: "SP",
});
console.log(`pessoa ${personName} (#${person.id}) provisionada`);

// Next em dev compila a rota no primeiro acesso; pré-aquecer evita que o filme
// registre o compile em vez do produto.
await Promise.all(
  ["/pessoas/fisicas", "/clients", "/contracts", "/invoices?view=table"].map((route) =>
    fetch(`${WEB}${route}`).catch(() => {}),
  ),
);

const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader", "--force-device-scale-factor=1"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: "pt-BR",
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
});
// O indicador de dev do Next não é produto e não entra no filme. Ele monta num
// custom element de shadow DOM (`:host { all: initial }`) e a hidratação varre
// <style> injetado, então a única remoção estável é tirar o elemento do DOM —
// em init script, para valer em toda navegação, inclusive no reload final.
await context.addInitScript(() => {
  const kill = () =>
    document.querySelectorAll("nextjs-portal").forEach((element) => element.remove());
  setInterval(kill, 120);
  document.addEventListener("DOMContentLoaded", kill);
});
const page = await context.newPage();

// 1. O cadastro se corrige onde é lido: lápis na célula, formulário da linha.
await page.goto(`${WEB}/pessoas/fisicas`, { waitUntil: "networkidle" });
const personRow = page.getByRole("listitem").filter({ hasText: cpfMask(cpf) });
await personRow.waitFor();
await page.waitForTimeout(1100);

await personRow.getByRole("button", { name: "Editar telefone" }).click();
const personDialog = page.getByRole("dialog");
await personDialog.getByText("Editar pessoa física").waitFor();
await page.waitForTimeout(500);
const phoneField = personDialog.getByLabel("Telefone");
await phoneField.click();
await phoneField.press("ControlOrMeta+a");
// digitado, não colado: a máscara se forma na frente de quem assiste
await phoneField.pressSequentially(novoTelefone, { delay: 55 });
await page.waitForTimeout(400);
await personDialog.getByRole("button", { name: "Salvar" }).click();
await personRow.getByText("(11) 94422-3310").waitFor();
await page.waitForTimeout(1200);

// 2. O CPF já cadastrado vira cliente pela interface.
await page.goto(`${WEB}/clients`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.getByRole("button", { name: "Novo cliente" }).click();
const clientDialog = page.getByRole("dialog");
await clientDialog.locator("#client-person").click();
const candidate = page
  .locator('[data-slot="select-item"]')
  .filter({ hasText: cpfMask(cpf) })
  .first();
await candidate.waitFor();
await page.waitForTimeout(400);
await candidate.click();
await page.waitForTimeout(600);
await clientDialog.getByRole("button", { name: "Cadastrar cliente" }).click();
await page.waitForURL(/\/clients\/\d+$/);
await page.getByRole("heading", { name: personName }).waitFor();
const clientId = Number(new URL(page.url()).pathname.split("/").pop());
await page.waitForTimeout(900);

// 3. O contrato nasce vinculado ao cliente e abre sua página própria.
await page.getByRole("button", { name: "Novo contrato" }).click();
const contractDialog = page.getByRole("dialog");
await contractDialog.getByLabel("Título").fill(contractTitle);
await contractDialog.getByLabel("Valor mensal").fill("2400,00");
await contractDialog.getByLabel("Dia").fill("20");
await page.waitForTimeout(500);
await contractDialog.getByRole("button", { name: "Criar contrato" }).click();
await page.waitForURL(/\/contracts\/\d+$/);
await page.getByRole("heading", { name: contractTitle }).waitFor();
const contractId = Number(new URL(page.url()).pathname.split("/").pop());
await page.waitForTimeout(1000);

// 4. A primeira fatura é gerada pela ação do contrato.
await page.getByRole("button", { name: "Gerar próxima fatura" }).click();
await page.getByText(/Próximo vencimento/).waitFor();
await page.waitForTimeout(700);

const invoicePage = await (
  await fetch(`${BFF}/bff/invoices?clientId=${clientId}&size=20`)
).json();
const invoice = invoicePage.content.find((item) => item.contract.id === contractId);
if (!invoice) throw new Error("fatura recém-gerada não encontrada");
const invoiceNumber = String(invoice.id).padStart(4, "0");

await page.getByRole("link", { name: /Ver faturas/ }).click();
await page.waitForURL(/\/invoices/);
await page.goto(`${WEB}/invoices?clientId=${clientId}&view=table`, { waitUntil: "networkidle" });
const record = page.locator("tbody tr", { hasText: invoiceNumber });
await record.waitFor();
await page.waitForTimeout(1000);

// 5. Cobrança Pix e QR com EMV real.
await record.getByRole("button", { name: "Cobrar via Pix" }).click();
const pixDialog = page.getByRole("dialog");
await pixDialog.locator("canvas").waitFor();
await page.waitForTimeout(1800);

// 6. O webhook HMAC e o worker liquidam; a UI descobre pelo polling.
const charges = await (await fetch(`${PAYMENTS}/invoices/${invoice.id}/charges`)).json();
const txid = charges[charges.length - 1].providerRef;
const body = JSON.stringify({ e2eId: `GIF-${invoice.id}-${stamp}`, txid, status: "CONCLUIDA" });
const signature = createHmac("sha256", secret).update(body).digest("hex");
const webhook = await fetch(`${GATEWAY}/api/payments/webhooks/pix`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Signature": signature },
  body,
});
if (!webhook.ok) throw new Error(`webhook respondeu ${webhook.status}`);
console.log("webhook:", (await webhook.json()).result);

await pixDialog.getByLabel(/^Paga —/).waitFor({ timeout: 30_000 });
await page.waitForTimeout(1500);
// A listagem do BFF tem uma janela curta de cache. Deixamos o selo em cena
// enquanto ela expira e então relemos a página para encerrar no estado PAGA.
await page.waitForTimeout(3000);
await page.keyboard.press("Escape");
await page.reload({ waitUntil: "networkidle" });
await record.getByText("PAGA", { exact: true }).waitFor({ timeout: 30_000 });
await page.waitForTimeout(1500);

await context.close();
await browser.close();
console.log("vídeo gravado em", outDir);
