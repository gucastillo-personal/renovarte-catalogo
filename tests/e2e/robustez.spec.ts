import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { NOSCRIPT_CARRITO, NOSCRIPT_FICHA } from "../../src/lib/cart/copy";
import type { Product } from "../../src/lib/types";

/**
 * spec 0017, F18 — robustez transversal: el carrito y las órdenes nunca
 * rompen el catálogo (AC-21), el sitio degrada sin JS, respeta
 * `prefers-reduced-motion` y no desborda a 390px. Los datos salen de
 * `public/data/products.json`, como `cart.spec.ts`.
 */

const CART_KEY = "renovarte:carrito:v1";
const WS_URL = "wss://colibri.test/ws";

const products = JSON.parse(
  readFileSync(path.join(process.cwd(), "public", "data", "products.json"), "utf-8"),
) as Product[];
const nameCount = new Map<string, number>();
for (const p of products) nameCount.set(p.nombre, (nameCount.get(p.nombre) ?? 0) + 1);
const [A, B] = products.filter((p) => nameCount.get(p.nombre) === 1 && p.presentacion.trim() !== "") as [
  Product,
  Product,
];

async function seedCart(page: Page, lines: Array<{ p: Product; cantidad: number }>) {
  await page.goto("/");
  await page.evaluate(
    ([k, raw]) => localStorage.setItem(k as string, raw as string),
    [
      CART_KEY,
      JSON.stringify({
        v: 1,
        lines: lines.map(({ p, cantidad }) => ({
          producto_id: p.id,
          cantidad,
          precio_visto: p.precio_venta,
          nombre: p.nombre,
          presentacion: p.presentacion,
          imagen: p.imagen,
        })),
      }),
    ],
  );
}

// Playwright ignora el contenido de `<noscript>` en sus selectores de texto: se lee el DOM.
const avisosNoscript = (page: Page) =>
  page.evaluate(() => Array.from(document.querySelectorAll("main noscript")).map((n) => n.textContent?.trim() ?? "").join("\n"));

const sinScrollHorizontal = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe("AC-21 — con el servicio de órdenes caído el catálogo sigue entero", () => {
  test("grilla, búsqueda, ficha y chat funcionan con https://ordenes.test/** abortado", async ({ page }) => {
    await page.route("https://ordenes.test/**", (route) => route.abort("failed"));
    await page.routeWebSocket(WS_URL, () => {});

    await page.goto("/");
    const cards = page.locator("main ul > li");
    await expect(cards).toHaveCount(products.length);

    const box = page.getByRole("searchbox", { name: "Buscar producto" });
    await box.fill(A.nombre);
    await expect(cards.first()).toContainText(A.nombre);
    await expect(cards).not.toHaveCount(products.length);
    await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
    await expect(cards).toHaveCount(products.length);

    await page.locator(`main ul > li a[href="/producto/${A.id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/producto/${A.id}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(A.nombre);
    await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeVisible();

    await page.getByRole("button", { name: "Abrir chat con Colibrí" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("agregar al carrito y abrir /carrito no necesita el servicio de órdenes", async ({ page }) => {
    await page.route("https://ordenes.test/**", (route) => route.abort("failed"));
    await page.goto(`/producto/${A.id}`);
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await page.goto("/carrito");
    await expect(page.getByRole("heading", { level: 1, name: "Tu carrito" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Productos en tu carrito" })).toContainText(A.nombre);
  });
});

test.describe("Sin JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("el link del header navega a /carrito y la ficha y /carrito muestran su aviso noscript", async ({
    page,
  }) => {
    await page.goto(`/producto/${A.id}`);
    expect(await avisosNoscript(page)).toContain(NOSCRIPT_FICHA);

    await page.locator("header").getByRole("link", { name: /^Carrito/ }).click();
    await expect(page).toHaveURL(/\/carrito$/);
    await expect(page.getByRole("heading", { level: 1, name: "Tu carrito" })).toBeVisible();
    expect(await avisosNoscript(page)).toContain(NOSCRIPT_CARRITO);
  });
});

test.describe("prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("el contador del header sube sin escala", async ({ page }) => {
    await page.goto(`/producto/${A.id}`);
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    const contador = page.locator("header").getByRole("link", { name: /^Carrito/ }).locator("span[aria-hidden]");
    await expect(contador).toHaveText("1");
    expect(await contador.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });

  test("la confirmación del combo aparece sin fade", async ({ page }) => {
    await page.routeWebSocket(WS_URL, (ws) => {
      ws.onMessage((raw) => {
        const received = JSON.parse(String(raw));
        if (received.type !== "user_message") return;
        const combo = {
          nivel: "mas_barato",
          items: [A, B].map((p) => ({
            producto_id: p.id,
            nombre: p.nombre,
            presentacion: p.presentacion,
            precio_venta: p.precio_venta,
          })),
          total: A.precio_venta + B.precio_venta,
        };
        const env = (type: string, payload: unknown) =>
          JSON.stringify({ v: 1, type, turn_id: received.turn_id, ts: new Date().toISOString(), payload });
        ws.send(env("combo_recommendation", { combos: [combo, { ...combo, nivel: "medio" }, { ...combo, nivel: "premium" }] }));
      });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir chat con Colibrí" }).click();
    await page.getByRole("textbox", { name: "Mensaje para Colibrí" }).fill("piel seca");
    await page.getByRole("button", { name: "Enviar mensaje" }).click();
    const card = page.getByTestId("chat-combo-card").first();
    await card.getByRole("button", { name: /^Agregar combo al carrito/ }).click();
    const resultado = card.getByTestId("chat-combo-resultado");
    await expect(resultado).toBeVisible();
    expect(await resultado.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });
});

test("control: sin reduced-motion el contador sí anima (el test de arriba no pasa en vacío)", async ({ page }) => {
  await page.goto(`/producto/${A.id}`);
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  const contador = page.locator("header").getByRole("link", { name: /^Carrito/ }).locator("span[aria-hidden]");
  await expect(contador).toHaveText("1");
  expect(await contador.evaluate((el) => getComputedStyle(el).animationName)).toBe("cart-count-pop");
});

test.describe("Viewport de 390px", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("/carrito (con líneas) y la ficha no tienen scroll horizontal", async ({ page }) => {
    await seedCart(page, [
      { p: A, cantidad: 10 },
      { p: B, cantidad: 2 },
    ]);
    await page.goto("/carrito");
    await expect(page.getByRole("heading", { level: 1, name: "Tu carrito" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Productos en tu carrito" })).toContainText(A.nombre);
    expect(await sinScrollHorizontal(page)).toBe(true);

    await page.goto(`/producto/${A.id}`);
    await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeVisible();
    await expect(page.getByText(/En tu carrito: 10/)).toBeVisible();
    expect(await sinScrollHorizontal(page)).toBe(true);
  });
});
