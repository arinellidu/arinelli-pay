import { defineConfig } from "@playwright/test";

/** Demo E2E contra o ambiente local completo (compose + serviços + web). */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 720 },
    video: "on",
    locale: "pt-BR",
  },
});
