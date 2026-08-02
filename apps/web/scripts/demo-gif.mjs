// Grava o fluxo do aceite P07: cobrar via Pix → QR → webhook real → PAGA sem reload.
import { chromium } from "playwright";
import { createHmac } from "node:crypto";

const outDir = process.argv[2] ?? ".";
const invoiceId = Number(process.argv[3] ?? 4);
const secret = process.env.WEBHOOK_HMAC_SECRET ?? "change-me";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: "pt-BR",
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();

await page.goto("http://localhost:3000/invoices", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// card da fatura-alvo → COBRAR VIA PIX (cria charge REAL com uuid do client)
const card = page.locator("article", { hasText: `FATURA ${String(invoiceId).padStart(4, "0")}` });
await card.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await card.getByRole("button", { name: "COBRAR VIA PIX" }).click();
await page.getByRole("dialog").waitFor();
await page.waitForTimeout(2200); // QR + copia-e-cola em cena

// webhook assinado (fora do browser): o backend liquida de verdade
const charges = await (await fetch(`http://localhost:3001/bff/invoices/${invoiceId}/status`)).json();
void charges;
const list = await (await fetch(`http://localhost:8082/invoices/${invoiceId}/charges`)).json();
const txid = list[list.length - 1].providerRef;
const body = JSON.stringify({ e2eId: `E2E-GIF-${invoiceId}`, txid, status: "CONCLUIDA" });
const signature = createHmac("sha256", secret).update(body).digest("hex");
const webhook = await fetch("http://localhost:8090/api/payments/webhooks/pix", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Signature": signature },
  body,
});
console.log("webhook:", (await webhook.json()).result);

// polling de 3s do modal pinta o carimbo PAGA sozinho
await page.getByRole("dialog").getByText("PAGA", { exact: true }).waitFor({ timeout: 15000 });
await page.waitForTimeout(1800);
await page.getByRole("button", { name: "Fechar" }).click();
await page.waitForTimeout(2500); // router.refresh: card carimbado PAGA

await context.close();
await browser.close();
console.log("video gravado em", outDir);
