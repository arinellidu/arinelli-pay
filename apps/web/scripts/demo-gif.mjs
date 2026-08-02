// Grava o loop do aceite: cobrar via Pix → QR real → webhook assinado →
// selo de liquidação + varredura do campo de sinal → card carimbado sem reload.
//
// Provisiona os próprios dados a cada rodada (CPF válido gerado), então é
// regravável do zero: `node scripts/demo-gif.mjs <dir-de-saida>`.
// Pré-requisito: stack local inteira de pé (compose + cores + gateway + BFF + web + worker).
import { chromium } from "playwright";
import { createHmac } from "node:crypto";

const outDir = process.argv[2] ?? ".";
const BFF = process.env.BFF_URL ?? "http://localhost:3001";
const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const GATEWAY = process.env.GATEWAY_URL ?? "http://localhost:8090";
const PAYMENTS = process.env.PAYMENTS_URL ?? "http://localhost:8082";
const secret = process.env.WEBHOOK_HMAC_SECRET ?? "change-me";

/** CPF válido novo por rodada: 9 dígitos aleatórios + DVs reais (mod 11). */
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

// ── dados da rodada: cliente + contrato + fatura aberta ────────────────────
const stamp = Date.now().toString().slice(-6);
const client = await post(`${BFF}/bff/clients`, {
  document: generateValidCpf(),
  name: `Estúdio Meridiano ${stamp}`,
  email: `contato${stamp}@meridiano.studio`,
});
const contract = await post(`${BFF}/bff/contracts`, {
  clientId: client.id,
  title: "Identidade visual — parcelas",
  amount: 2400.0,
  billingDay: 20,
});
const invoice = await post(`${BFF}/bff/contracts/${contract.id}/invoices:generate-next`);
const invoiceNumber = String(invoice.id).padStart(4, "0");
console.log(`fatura ${invoiceNumber} criada para ${client.name}`);

// o BFF cacheia a lista de clientes por 5s; sem esperar essa janela o filtro
// Cliente abre mostrando o id cru em vez do nome recém-criado
await new Promise((resolve) => setTimeout(resolve, 7000));

// ── browser ───────────────────────────────────────────────────────────────
// o campo de fundo é WebGL2: sem SwiftShader liberado o headless entrega uma
// tela chapada e o vídeo perde exatamente o que ele existe para mostrar
const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader", "--force-device-scale-factor=1"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: "pt-BR",
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
// o indicador de devtools do Next não faz parte do produto — fora do quadro
await page.addStyleTag({
  content: "nextjs-portal, [data-nextjs-toast] { display: none !important; }",
}).catch(() => {});

await page.goto(`${WEB}/invoices?clientId=${client.id}`, { waitUntil: "networkidle" });
await page.addStyleTag({
  content: "nextjs-portal, [data-nextjs-toast] { display: none !important; }",
});
const card = page.locator("article", { hasText: `Fatura ${invoiceNumber}` });
await card.waitFor();
await page.waitForTimeout(1800);

// Cobrar via Pix — a Idempotency-Key nasce no client (uuid)
await card.getByRole("button", { name: "Cobrar via Pix" }).click();
const dialog = page.getByRole("dialog");
await dialog.waitFor();
await dialog.locator("canvas").waitFor(); // QR do EMV real, com CRC16
await page.waitForTimeout(2600);

// pagamento simulado: webhook assinado (HMAC sobre o corpo cru) no gateway
const charges = await (await fetch(`${PAYMENTS}/invoices/${invoice.id}/charges`)).json();
const txid = charges[charges.length - 1].providerRef;
const body = JSON.stringify({ e2eId: `GIF-${invoice.id}-${stamp}`, txid, status: "CONCLUIDA" });
const signature = createHmac("sha256", secret).update(body).digest("hex");
const webhook = await fetch(`${GATEWAY}/api/payments/webhooks/pix`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Signature": signature },
  body,
});
console.log("webhook:", (await webhook.json()).result);

// o polling de 3s traz o estado; o selo cai e o campo varre a tela
await dialog.getByLabel(/^Paga —/).waitFor({ timeout: 20_000 });
await page.waitForTimeout(2600);

// Esc fecha o painel; só então o refresh adiado repinta a lista
await page.keyboard.press("Escape");
const closedAt = Date.now();
await card.getByText("PAGA", { exact: true }).waitFor({ timeout: 60_000 });
console.log(`etiqueta PAGA no card em ${Date.now() - closedAt}ms`);
await page.waitForTimeout(2400);

await context.close();
await browser.close();
console.log("video gravado em", outDir);
