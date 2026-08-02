import { expect, test } from "@playwright/test";
import { createHmac } from "node:crypto";

/**
 * Demo loop completo do README, gravado em vídeo:
 * cliente → contrato → fatura → Cobrar via Pix → QR → pagamento simulado
 * (webhook HMAC — é o simulador de pagamento que existe no ambiente com o
 * provider fake) → worker Go liquida → selo PAGA sem reload.
 *
 * Pré-requisito: stack local inteira de pé (compose + billing/payments/
 * gateway + bff + web + worker). O spec cria dados novos a cada rodada
 * (CPF válido gerado), então pode regravar do zero quantas vezes quiser.
 */

const BFF = process.env.BFF_URL ?? "http://localhost:3001";
const GATEWAY = process.env.GATEWAY_URL ?? "http://localhost:8090";
const PAYMENTS = process.env.PAYMENTS_URL ?? "http://localhost:8082";
const HMAC_SECRET = process.env.WEBHOOK_HMAC_SECRET ?? "change-me";

/** CPF válido novo por rodada: 9 dígitos aleatórios + DVs reais (mod 11). */
function generateValidCpf(): string {
  const digits: number[] = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (new Set(digits).size === 1) digits[0] = (digits[0] + 1) % 10;
  for (const length of [9, 10] as const) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += digits[i] * (length + 1 - i);
    const remainder = (sum * 10) % 11;
    digits.push(remainder === 10 ? 0 : remainder);
  }
  return digits.join("");
}

function sign(body: string): string {
  return createHmac("sha256", HMAC_SECRET).update(body).digest("hex");
}

test("demo: fatura → QR Pix → pagamento simulado → selo PAGA sem reload", async ({
  page,
  request,
}) => {
  // setup via BFF (sem UI de cadastro no v1): cliente novo + contrato + fatura
  const stamp = Date.now().toString().slice(-6);
  const clientResponse = await request.post(`${BFF}/bff/clients`, {
    data: {
      document: generateValidCpf(),
      name: `Cliente Demo ${stamp}`,
      email: `demo${stamp}@arinelli.dev`,
    },
  });
  expect(clientResponse.status()).toBe(201);
  const client = (await clientResponse.json()) as { id: number };

  const contractResponse = await request.post(`${BFF}/bff/contracts`, {
    data: { clientId: client.id, title: "Assinatura Demo", amount: 350.0, billingDay: 20 },
  });
  expect(contractResponse.status()).toBe(201);
  const contract = (await contractResponse.json()) as { id: number };

  const invoiceResponse = await request.post(
    `${BFF}/bff/contracts/${contract.id}/invoices:generate-next`,
  );
  expect(invoiceResponse.status()).toBe(201);
  const invoice = (await invoiceResponse.json()) as { id: number };
  const invoiceNumber = String(invoice.id).padStart(4, "0");

  // o vídeo começa aqui: carteira do cliente com a fatura ABERTA
  await page.goto(`/invoices?clientId=${client.id}`, { waitUntil: "networkidle" });
  const card = page.locator("article", { hasText: `Fatura ${invoiceNumber}` });
  await expect(card).toBeVisible();
  await page.waitForTimeout(1200);

  // Cobrar via Pix — Idempotency-Key nasce no client (uuid)
  await card.getByRole("button", { name: "Cobrar via Pix" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("canvas")).toBeVisible(); // QR do EMV real
  await page.waitForTimeout(2200);

  // pagamento simulado: webhook assinado (HMAC sobre o corpo cru) no gateway
  const chargesResponse = await request.get(`${PAYMENTS}/invoices/${invoice.id}/charges`);
  const charges = (await chargesResponse.json()) as { providerRef: string }[];
  const txid = charges[charges.length - 1].providerRef;
  const webhookBody = JSON.stringify({
    e2eId: `E2E-DEMO-${invoice.id}-${stamp}`,
    txid,
    status: "CONCLUIDA",
  });
  const webhookResponse = await request.post(`${GATEWAY}/api/payments/webhooks/pix`, {
    headers: { "Content-Type": "application/json", "X-Signature": sign(webhookBody) },
    data: webhookBody,
  });
  expect(webhookResponse.status()).toBe(200);
  expect(((await webhookResponse.json()) as { result: string }).result).toBe("processed");

  // o polling de 3s traz o estado e o selo cai com o painel ainda aberto
  await expect(dialog.getByLabel(/^Paga —/)).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);

  // Esc fecha o painel; só então o refresh adiado repinta a lista (se o refresh
  // rodasse durante a liquidação, o card sairia da listagem e mataria o selo)
  await page.keyboard.press("Escape");
  await expect(card.getByText("PAGA", { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2000); // pausa final na etiqueta
});
