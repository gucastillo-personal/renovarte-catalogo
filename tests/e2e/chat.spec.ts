import { expect, test, type Page } from "@playwright/test";

/**
 * spec 0016 — Colibrí chat e2e suite. No real `renovarte-chat-gateway`/
 * `renovarte-colibri-rag` exist yet, so every test scripts the WebSocket
 * server side with `page.routeWebSocket()` against the placeholder
 * `NEXT_PUBLIC_CHAT_WS_URL` baked in by `playwright.config.ts`'s
 * `webServer.env` — verified against the installed `@playwright/test`
 * (`node_modules/.pnpm/playwright-core@1.63.0/.../types/types.d.ts`), per
 * `plan.md` "## Frontend" > "Testing del transporte sin gateway real ni
 * dependencias nuevas".
 *
 * IMPORTANT ordering caveat, confirmed empirically against the installed
 * `playwright-core@1.63.0` (not documented explicitly in the JSDoc, and
 * different from `page.route()`'s HTTP interception, which has no such
 * requirement): `page.routeWebSocket()` only takes effect for WebSockets
 * opened by documents loaded *after* the route is registered. Since our
 * app's connection is lazy (the socket only opens once the visitor clicks
 * the FAB, well after the page has loaded), it's tempting to register the
 * route right before that click — but that document was already loaded
 * before the route call, so the interception silently never attaches and
 * the browser attempts (and fails) a real network connection instead.
 * Every test below registers `routeWebSocket()` *before* `page.goto()`.
 *
 * New file, doesn't touch `tests/e2e/catalog.spec.ts` (T17).
 */

const WS_URL = "wss://colibri.test/ws";

interface ComboItemFixture {
  producto_id: string;
  nombre: string;
  presentacion: string;
  precio_venta: number;
}

function combo(
  nivel: "mas_barato" | "medio" | "premium",
  total: number,
): { nivel: string; items: ComboItemFixture[]; total: number } {
  return {
    nivel,
    items: [
      { producto_id: "1", nombre: "Limpiador facial", presentacion: "160 g", precio_venta: total * 0.6 },
      { producto_id: "2", nombre: "Emulsión humectante", presentacion: "100 ml", precio_venta: total * 0.4 },
    ],
    total,
  };
}

const THREE_COMBOS = [combo("mas_barato", 30000), combo("medio", 40000), combo("premium", 55000)];

function envelope(type: string, payload: unknown, turnId = "srv-turn"): string {
  return JSON.stringify({ v: 1, type, turn_id: turnId, ts: new Date().toISOString(), payload });
}

async function openViaFab(page: Page) {
  await page.getByRole("button", { name: "Abrir chat con Colibrí" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

// --- AC-1: opens without login/session --------------------------------------

test("AC-1: opens the chat from the site with no cookie/session required", async ({ page, context }) => {
  await page.routeWebSocket(WS_URL, () => {});
  await page.goto("/");
  expect(await context.cookies()).toHaveLength(0);

  await openViaFab(page);

  await expect(page.getByRole("textbox", { name: "Mensaje para Colibrí" })).toBeVisible();
  expect(await context.cookies()).toHaveLength(0);
});

// --- T9: dialog shell, focus trap, return focus -----------------------------

test("T9: focus starts inside the panel (never body), Tab/Shift+Tab stay trapped inside it", async ({
  page,
}) => {
  await page.routeWebSocket(WS_URL, () => {});
  await page.goto("/");
  await openViaFab(page);

  const insideDialog = () =>
    page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null);
  await expect.poll(insideDialog).toBe(true);

  await page.keyboard.press("Shift+Tab"); // wraps from first to last focusable
  await expect.poll(insideDialog).toBe(true);

  await page.keyboard.press("Tab"); // back to first
  await expect.poll(insideDialog).toBe(true);
});

test("T9: Escape closes the panel and returns focus exactly to the FAB", async ({ page }) => {
  await page.routeWebSocket(WS_URL, () => {});
  await page.goto("/");
  const fab = page.getByRole("button", { name: "Abrir chat con Colibrí" });
  await fab.click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(fab).toBeFocused();
});

test("T9: opening via the home invite card returns focus there on close (different trigger)", async ({
  page,
}) => {
  await page.routeWebSocket(WS_URL, () => {});
  await page.goto("/");
  const card = page.getByRole("button", { name: "Iniciar chat con Colibrí" });
  await card.click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByRole("button", { name: "Cerrar chat" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).toBeFocused();
});

test("T9: clicking the desktop scrim closes the panel", async ({ page }) => {
  await page.routeWebSocket(WS_URL, () => {});
  await page.goto("/");
  await openViaFab(page);

  await page.locator('[data-testid="chat-scrim"]').click({ position: { x: 10, y: 10 } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

// --- T10: profile bar --------------------------------------------------------

test("T10: profile bar appears once both slots are confirmed, updates without duplicating", async ({
  page,
}) => {
  await page.routeWebSocket(WS_URL, (ws) => {
    ws.send(envelope("profile_confirmed", { tipo_piel: "seca", presupuesto: 40000 }));
    ws.send(envelope("profile_confirmed", { presupuesto: 55000 }));
  });
  await page.goto("/");
  await openViaFab(page);

  const bar = page.getByTestId("chat-profile-bar");
  await expect(bar).toHaveCount(1);
  await expect(bar).toContainText("seca");
  await expect(bar).toContainText((55000).toLocaleString("es-AR"));
});

test("T10: 'Cambiar' focuses the composer with the override placeholder", async ({ page }) => {
  await page.routeWebSocket(WS_URL, (ws) => {
    ws.send(envelope("profile_confirmed", { tipo_piel: "grasa", presupuesto: 30000 }));
  });
  await page.goto("/");
  await openViaFab(page);

  await page.getByRole("button", { name: "Cambiar tipo de piel o presupuesto" }).click();
  const textbox = page.getByRole("textbox", { name: "Mensaje para Colibrí" });
  await expect(textbox).toBeFocused();
  await expect(textbox).toHaveAttribute("placeholder", "Contame el nuevo tipo de piel o presupuesto");
});

// --- T11: thread, streaming buffer never announced per token -----------------

test("T11: text is announced once, fully formed — text_delta tokens never enter the log", async ({
  page,
}) => {
  await page.routeWebSocket(WS_URL, (ws) => {
    ws.onMessage((raw) => {
      const received = JSON.parse(String(raw));
      if (received.type !== "user_message") return;
      ws.send(envelope("text_delta", { token: "Hola" }, received.turn_id));
      ws.send(envelope("text_delta", { token: " que tal" }, received.turn_id));
      ws.send(envelope("text_done", { text: "Hola que tal" }, received.turn_id));
    });
  });
  await page.goto("/");
  await openViaFab(page);

  await page.getByRole("textbox", { name: "Mensaje para Colibrí" }).fill("hola");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();

  const log = page.getByRole("log");
  await expect(log).toContainText("Hola que tal");
  // greeting + the visitor's own message + the final assistant text — never
  // one bubble per token.
  await expect(log.getByTestId("chat-message-bubble")).toHaveCount(3);
  await expect(page.getByTestId("chat-typing-indicator")).toHaveCount(0);
});

// --- T12: combo cards ---------------------------------------------------------

test("T12: all 3 combo cards mount at once, in ascending order, deep-linking to /producto/[id] in a new tab", async ({
  page,
}) => {
  await page.routeWebSocket(WS_URL, (ws) => {
    ws.onMessage((raw) => {
      const received = JSON.parse(String(raw));
      if (received.type !== "user_message") return;
      ws.send(envelope("text_done", { text: "Encontré estas opciones para vos" }, received.turn_id));
      ws.send(envelope("profile_confirmed", { tipo_piel: "seca", presupuesto: 40000 }, received.turn_id));
      ws.send(envelope("combo_recommendation", { combos: THREE_COMBOS }, received.turn_id));
    });
  });
  await page.goto("/");
  await openViaFab(page);

  await page.getByRole("textbox", { name: "Mensaje para Colibrí" }).fill("piel seca, presupuesto 40000");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();

  const cards = page.getByTestId("chat-combo-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toHaveAttribute("data-nivel", "mas_barato");
  await expect(cards.nth(1)).toHaveAttribute("data-nivel", "medio");
  await expect(cards.nth(2)).toHaveAttribute("data-nivel", "premium");

  const firstProductLink = cards.nth(0).locator('a[href="/producto/1"]');
  await expect(firstProductLink).toHaveAttribute("target", "_blank");
  await expect(firstProductLink).toHaveAttribute("rel", "noopener");
});

// --- T13: composer disabled while a turn is in flight -------------------------

test("T13: composer disables on send, re-enables once the turn's terminal envelope arrives", async ({
  page,
}) => {
  await page.routeWebSocket(WS_URL, (ws) => {
    ws.onMessage((raw) => {
      const received = JSON.parse(String(raw));
      if (received.type !== "user_message") return;
      setTimeout(() => {
        ws.send(envelope("text_done", { text: "¿Cuál es tu presupuesto?" }, received.turn_id));
      }, 100);
    });
  });
  await page.goto("/");
  await openViaFab(page);

  const textbox = page.getByRole("textbox", { name: "Mensaje para Colibrí" });
  await textbox.fill("piel seca");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();

  await expect(textbox).toBeDisabled();
  await expect(textbox).toBeEnabled();
});

// --- T14: "chat no disponible" ------------------------------------------------

test("T14a: unavailable at open (budget_cap) replaces the greeting, keeps the close button working", async ({
  page,
}) => {
  await page.routeWebSocket(WS_URL, (ws) => {
    ws.send(envelope("unavailable", { reason: "budget_cap" }));
  });
  await page.goto("/");
  await openViaFab(page);

  const block = page.getByTestId("chat-unavailable-block");
  await expect(block).toBeVisible();
  await expect(block).toContainText("límite de uso");
  await expect(page.getByRole("textbox", { name: "Mensaje para Colibrí" })).toBeDisabled();

  await page.getByRole("button", { name: "Cerrar chat" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("T14b: an unrecognized reason falls back to the generic copy", async ({ page }) => {
  await page.routeWebSocket(WS_URL, (ws) => {
    ws.send(envelope("unavailable", { reason: "maintenance" }));
  });
  await page.goto("/");
  await openViaFab(page);

  const block = page.getByTestId("chat-unavailable-block");
  await expect(block).toBeVisible();
  await expect(block).toContainText("no está disponible en este momento");
});

test("T14c: unavailable mid-conversation keeps the existing thread intact, only the footer changes", async ({
  page,
}) => {
  let turnCount = 0;
  await page.routeWebSocket(WS_URL, (ws) => {
    ws.onMessage((raw) => {
      const received = JSON.parse(String(raw));
      if (received.type !== "user_message") return;
      turnCount += 1;
      if (turnCount === 1) {
        ws.send(envelope("text_done", { text: "¡Hola! Contame tu tipo de piel." }, received.turn_id));
        return;
      }
      // The spend cap is hit on this later turn — the thread so far must
      // survive, only the composer/footer area reacts.
      ws.send(envelope("unavailable", { reason: "budget_cap" }, received.turn_id));
    });
  });
  await page.goto("/");
  await openViaFab(page);

  const textbox = page.getByRole("textbox", { name: "Mensaje para Colibrí" });
  await textbox.fill("hola");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(page.getByRole("log")).toContainText("¡Hola! Contame tu tipo de piel.");

  await textbox.fill("piel seca, presupuesto 40000");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();

  // Prior thread content is untouched...
  await expect(page.getByRole("log")).toContainText("¡Hola! Contame tu tipo de piel.");
  await expect(page.getByRole("log")).toContainText("hola");
  // ...and the unavailable notice now sits in the footer, not replacing it.
  await expect(page.getByTestId("chat-unavailable-block")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Mensaje para Colibrí" })).toBeDisabled();
});

test("T14d: a socket closed by the server reconnects with backoff, then shows 'no disponible' instead of hanging", async ({
  page,
}) => {
  // Backoff is 500+1000+2000+4000+8000 ms before giving up.
  test.setTimeout(60_000);
  let connections = 0;
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.routeWebSocket(WS_URL, (ws) => {
    connections += 1;
    ws.close();
  });
  await page.goto("/");
  await openViaFab(page);

  await expect(page.getByTestId("chat-unavailable-block")).toBeVisible({ timeout: 30_000 });
  expect(connections).toBe(6); // first attempt + 5 reconnects
  expect(pageErrors).toEqual([]);
  await expect(page.getByRole("textbox", { name: "Mensaje para Colibrí" })).toBeDisabled();
});

// --- T15: no_recommendation -----------------------------------------------

test("T15: no_recommendation renders as a plain bubble, same shape as any assistant text", async ({
  page,
}) => {
  await page.routeWebSocket(WS_URL, (ws) => {
    ws.onMessage((raw) => {
      const received = JSON.parse(String(raw));
      if (received.type !== "user_message") return;
      ws.send(
        envelope(
          "no_recommendation",
          { mensaje: "No tengo una recomendación para eso con los productos que tenemos hoy." },
          received.turn_id,
        ),
      );
    });
  });
  await page.goto("/");
  await openViaFab(page);

  await page.getByRole("textbox", { name: "Mensaje para Colibrí" }).fill("quiero un perfume por $500");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();

  const log = page.getByRole("log");
  await expect(log).toContainText("No tengo una recomendación para eso");
  // Same test id family as any other bubble — no special error component.
  await expect(log.getByTestId("chat-message-bubble")).toHaveCount(3); // greeting + user + this one
  await expect(page.getByTestId("chat-combo-card")).toHaveCount(0);
});

// --- T16: prefers-reduced-motion ---------------------------------------------

test("T16: combo cards and the typing indicator still appear with prefers-reduced-motion: reduce", async ({
  page,
}) => {
  await page.routeWebSocket(WS_URL, (ws) => {
    ws.onMessage((raw) => {
      const received = JSON.parse(String(raw));
      if (received.type !== "user_message") return;
      ws.send(envelope("text_done", { text: "Encontré estas opciones" }, received.turn_id));
      ws.send(envelope("combo_recommendation", { combos: THREE_COMBOS }, received.turn_id));
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await openViaFab(page);

  await page.getByRole("textbox", { name: "Mensaje para Colibrí" }).fill("piel seca, presupuesto 40000");
  await page.getByRole("button", { name: "Enviar mensaje" }).click();
  await expect(page.getByTestId("chat-combo-card")).toHaveCount(3);
});

// --- T17: AC-1/AC-11/progresividad --------------------------------------------

test("AC-11: the catalog stays fully functional with the chat panel closed", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main ul > li").first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Categorías", exact: true })).toBeVisible();
});

test("AC-11: the catalog stays fully functional while the chat is unavailable", async ({ page }) => {
  await page.routeWebSocket(WS_URL, (ws) => {
    ws.send(envelope("unavailable", { reason: "maintenance" }));
  });
  await page.goto("/");
  await openViaFab(page);
  await expect(page.getByTestId("chat-unavailable-block")).toBeVisible();

  await page.getByRole("button", { name: "Cerrar chat" }).click();
  await expect(page.locator("main ul > li").first()).toBeVisible();
  const firstCard = page.locator("main ul > li a[href^='/producto/']").first();
  await firstCard.click();
  await expect(page).toHaveURL(/\/producto\//);
});

test("AC-11/progresividad: with JS permanently disabled, the FAB/home card are visible but inert, and the rest of the catalog still works via plain links", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");

  const fab = page.getByRole("button", { name: "Chat", exact: true });
  await expect(fab).toBeVisible();
  await expect(fab).toHaveAttribute("tabindex", "-1");

  const homeCard = page.getByRole("button", { name: "Iniciar chat", exact: true });
  await expect(homeCard).toBeVisible();
  await expect(homeCard).toHaveAttribute("tabindex", "-1");

  await expect(page.getByRole("dialog")).toHaveCount(0);

  const firstCard = page.locator("main ul > li a[href^='/producto/']").first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();
  await expect(page).toHaveURL(/\/producto\//);

  await context.close();
});
