import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Bakes a placeholder gateway URL into the client bundle so
    // `tests/e2e/chat.spec.ts` can exercise the "ready" path via
    // `page.routeWebSocket()` — no real `renovarte-chat-gateway` exists yet
    // (spec 0016, `plan.md` "## Frontend"). A public URL, never a secret
    // (constitution §II.4 reference note) — safe to bake into any build.
    //
    // Same idea for `renovarte-ordenes` (spec 0017, F13): the placeholder
    // Function URL is baked in and `tests/e2e/orden.spec.ts` answers it with
    // `page.route()` (see `tests/e2e/orders-mock.ts`). Public, never a secret.
    env: {
      NEXT_PUBLIC_CHAT_WS_URL: "wss://colibri.test/ws",
      NEXT_PUBLIC_ORDERS_API_URL: "https://ordenes.test",
    },
  },
});
