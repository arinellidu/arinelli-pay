// Rodada batched de inspeção (impeccable): desktop + mobile, todas as páginas.
import { chromium } from "playwright";

const outDir = process.argv[2] ?? ".";
const base = "http://localhost:3000";

const targets = [
  ["invoices-cards", `${base}/invoices`],
  ["invoices-table", `${base}/invoices?view=table`],
  ["clients", `${base}/clients`],
  ["client-detail", `${base}/clients/4?view=cards`],
];

const browser = await chromium.launch();
for (const [viewportName, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
]) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: "pt-BR" });
  const page = await context.newPage();
  for (const [name, url] of targets) {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${outDir}/${name}-${viewportName}.png`, fullPage: true });
    console.log(`${name}-${viewportName}.png`);
  }
  await context.close();
}
await browser.close();
