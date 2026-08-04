// Grava o fluxo de portfólio completo pela interface:
// pessoa cadastrada → cliente → contrato → fatura → Pix → webhook → PAGA.
//
// A pessoa sintética é provisionada pela API porque o foco do filme é o CRM
// de cobrança. Cliente, contrato, fatura e cobrança nascem pela própria UI.
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
const personName = `Marina Costa ${stamp}`;
const contractTitle = "Direção criativa mensal";

await post(`${BFF}/bff/people/pf`, {
  nome: personName,
  cpf,
  email: `marina${stamp}@costastudio.com.br`,
  telefone: "11987654321",
  cidade: "São Paulo",
  uf: "SP",
});
console.log(`pessoa ${personName} provisionada`);

const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader", "--force-device-scale-factor=1"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: "pt-BR",
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
const hideDevtools = async () => {
  await page
    .addStyleTag({ content: "nextjs-portal, [data-nextjs-toast] { display: none !important; }" })
    .catch(() => {});
};

// 1. O CPF já cadastrado vira cliente pela interface.
await page.goto(`${WEB}/clients`, { waitUntil: "networkidle" });
await hideDevtools();
await page.waitForTimeout(1200);
await page.getByRole("button", { name: "Novo cliente" }).click();
const clientDialog = page.getByRole("dialog");
const candidateValue = await clientDialog
  .locator("option")
  .filter({ hasText: personName })
  .getAttribute("value");
if (!candidateValue) throw new Error("pessoa provisionada não apareceu no cadastro de cliente");
await clientDialog.getByLabel("Pessoa cadastrada").selectOption(candidateValue);
await page.waitForTimeout(900);
await clientDialog.getByRole("button", { name: "Cadastrar cliente" }).click();
await page.waitForURL(/\/clients\/\d+$/);
await page.getByRole("heading", { name: personName }).waitFor();
const clientId = Number(new URL(page.url()).pathname.split("/").pop());
await page.waitForTimeout(1200);

// 2. O contrato nasce vinculado ao cliente e abre sua página própria.
await page.getByRole("button", { name: "Novo contrato" }).click();
const contractDialog = page.getByRole("dialog");
await contractDialog.getByLabel("Título").fill(contractTitle);
await contractDialog.getByLabel("Valor mensal").fill("2400,00");
await contractDialog.getByLabel("Dia").fill("20");
await page.waitForTimeout(700);
await contractDialog.getByRole("button", { name: "Criar contrato" }).click();
await page.waitForURL(/\/contracts\/\d+$/);
await page.getByRole("heading", { name: contractTitle }).waitFor();
const contractId = Number(new URL(page.url()).pathname.split("/").pop());
await page.waitForTimeout(1400);

// 3. A primeira fatura é gerada pela ação do contrato.
await page.getByRole("button", { name: "Gerar próxima fatura" }).click();
await page.getByText(/Próximo vencimento/).waitFor();
await page.waitForTimeout(900);

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
await page.waitForTimeout(1400);

// 4. Cobrança Pix e QR com EMV real.
await record.getByRole("button", { name: "Cobrar via Pix" }).click();
const pixDialog = page.getByRole("dialog");
await pixDialog.locator("canvas").waitFor();
await page.waitForTimeout(2200);

// 5. O webhook HMAC e o worker liquidam; a UI descobre pelo polling.
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
await page.waitForTimeout(2000);
// A listagem do BFF tem uma janela curta de cache. Deixamos o selo em cena
// enquanto ela expira e então relemos a página para encerrar no estado PAGA.
await page.waitForTimeout(3500);
await page.keyboard.press("Escape");
await page.reload({ waitUntil: "networkidle" });
await record.getByText("PAGA", { exact: true }).waitFor({ timeout: 30_000 });
await page.waitForTimeout(2200);

await context.close();
await browser.close();
console.log("vídeo gravado em", outDir);
