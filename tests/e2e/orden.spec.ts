import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { formatARS } from "../../src/lib/format";
import {
  MENSAJE_NOMBRE_INVALIDO,
  MENSAJE_NOMBRE_VACIO,
} from "../../src/lib/orders/validate-contact";
import type { Product } from "../../src/lib/types";
import {
  aceptada,
  falla,
  invalida,
  mockOrders,
  TOPE,
  type MockOptions,
  type OrdersMock,
} from "./orders-mock";

/**
 * spec 0017 — envío de la orden e2e (F13 envío/falla/tope, F14 rechazo por
 * catálogo y `GET /v1/estado`, F15 confirmación). El servicio real no está
 * desplegado: todo se contesta con `page.route()` (ver `orders-mock.ts`, que
 * documenta el preflight CORS). El reloj es de Playwright (`page.clock`) para
 * saltear la espera de 3,5 s del `form_token` y para el timeout de 15 s.
 */

const CART_KEY = "renovarte:carrito:v1";
const CONFIRMATION_KEY = "renovarte:orden-confirmada:v1";
const DRAFT_KEY = "renovarte:contacto-borrador:v1";
const ENVIO_KEY = "renovarte:envio-en-curso:v1";

// Canarios: el nombre se escribe con un espacio doble para probar la normalización.
const NOMBRE_TIPEADO = "Zulema  Qüintanilla";
const NOMBRE = "Zulema Qüintanilla";
const TELEFONO = "11 5555 5555";

const products = JSON.parse(
  readFileSync(path.join(process.cwd(), "public", "data", "products.json"), "utf-8"),
) as Product[];
const nameCount = new Map<string, number>();
for (const p of products) nameCount.set(p.nombre, (nameCount.get(p.nombre) ?? 0) + 1);
const sample = products.filter((p) => nameCount.get(p.nombre) === 1 && p.presentacion.trim() !== "");
const [A, B] = sample as [Product, Product];

function stored(lines: Array<{ p: Product; cantidad: number }>): string {
  return JSON.stringify({
    v: 1,
    lines: lines.map(({ p, cantidad }) => ({
      producto_id: p.id,
      cantidad,
      precio_visto: p.precio_venta,
      nombre: p.nombre,
      presentacion: p.presentacion,
      imagen: p.imagen,
    })),
  });
}

/** Instala el reloj, el mock, siembra el carrito y abre `/carrito` con el formulario listo. */
async function abrir(
  page: Page,
  opts: MockOptions = {},
  lines: Array<{ p: Product; cantidad: number }> = [{ p: A, cantidad: 2 }, { p: B, cantidad: 1 }],
): Promise<OrdersMock> {
  await page.addInitScript(() => {
    const w = window as unknown as { __copied: string[] };
    w.__copied = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (t: string) => void w.__copied.push(t) },
    });
  });
  const mock = await mockOrders(page, opts);
  await page.clock.install();
  await page.goto("/");
  await page.evaluate(([k, v]) => localStorage.setItem(k as string, v as string), [CART_KEY, stored(lines)]);
  await page.goto("/carrito");
  await expect(page.getByRole("heading", { name: "Tu carrito" })).toBeVisible();
  await expect.poll(() => mock.gets).toBeGreaterThan(0);
  return mock;
}

/** Salta la espera mínima del token (3,5 s) y deja que el GET de montaje ya haya terminado. */
async function esperarToken(page: Page) {
  await page.waitForTimeout(150);
  await page.clock.fastForward(4000);
}

const nombreInput = (page: Page) => page.getByLabel("Nombre y apellido");
const telefonoInput = (page: Page) => page.getByLabel("Teléfono", { exact: true });
const bannerNoEnviada = (page: Page) =>
  page.getByRole("alert").filter({ hasText: "Tu orden no se envió" });

async function completar(page: Page, nombre = NOMBRE_TIPEADO, telefono = TELEFONO) {
  await nombreInput(page).fill(nombre);
  await telefonoInput(page).fill(telefono);
}

async function enviar(page: Page) {
  await completar(page);
  await esperarToken(page);
  await page.getByRole("button", { name: "Enviar orden" }).click();
}

async function sessionKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(sessionStorage).sort());
}

test.describe("F13 — envío, falla y tope", () => {
  test("el POST cross-origin (localhost → ordenes.test) llega al mock y se contesta", async ({ page }) => {
    const mock = await abrir(page, { ordenes: [aceptada()] });
    await enviar(page);
    await expect(page.getByRole("heading", { name: "Tu orden fue enviada a RenovArte" })).toBeVisible();
    // Medido con @playwright/test 1.63: el preflight lo contesta Playwright solo; no llega al handler.
    expect(mock.preflights).toBe(0);
    expect(mock.posts).toHaveLength(1);
  });

  test("AC-17: el body tiene solo las claves del contrato y el nombre normalizado", async ({ page }) => {
    const mock = await abrir(page);
    await enviar(page);
    await expect.poll(() => mock.posts.length).toBe(1);
    const body = mock.post(0);
    expect(Object.keys(body).sort()).toEqual(
      ["contacto", "form_token", "idempotency_key", "lineas", "total_visto", "v"],
    );
    expect(body.contacto).toEqual({ nombre: NOMBRE, telefono: TELEFONO });
    expect(body.lineas).toHaveLength(2);
    for (const l of body.lineas) expect(Object.keys(l).sort()).toEqual(["cantidad", "precio_visto", "producto_id"]);
    expect(body.total_visto).toBe(A.precio_venta * 2 + B.precio_venta);
    expect(JSON.stringify(body)).not.toContain(A.nombre);
    expect(body.form_token).toBe("tok-1");
  });

  for (const [titulo, fallo] of [
    ["500", { ordenes: [falla(500), aceptada("RA-48271", 200)] }],
    ["abort de red", { ordenes: ["abort", aceptada("RA-48271", 200)] }],
  ] as const) {
    test(`AC-20 / AC-24: ${titulo} → banner enfocado, datos intactos y 'Reintentar envío' con la misma key`, async ({
      page,
    }) => {
      const mock = await abrir(page, { ordenes: [...fallo.ordenes] });
      await enviar(page);
      const banner = bannerNoEnviada(page);
      await expect(banner).toBeFocused();
      await expect(banner).toContainText(
        "No pudimos comunicarnos con RenovArte. Tu carrito y tus datos siguen acá: podés intentar de nuevo.",
      );
      await expect(page.getByRole("heading", { name: "Tu orden fue enviada a RenovArte" })).toHaveCount(0);
      // Carrito y datos intactos.
      await expect(page.getByRole("list", { name: "Productos en tu carrito" }).getByRole("listitem")).toHaveCount(2);
      await expect(nombreInput(page)).toHaveValue(NOMBRE_TIPEADO);
      await expect(telefonoInput(page)).toHaveValue(TELEFONO);
      expect(await sessionKeys(page)).not.toContain(CONFIRMATION_KEY);

      await banner.getByRole("button", { name: "Reintentar envío" }).click();
      await expect(page.getByRole("heading", { name: "Tu orden fue enviada a RenovArte" })).toBeVisible();
      await expect(page.getByText("RA-48271", { exact: true })).toBeVisible();
      expect(mock.posts).toHaveLength(2);
      expect(mock.post(1).idempotency_key).toBe(mock.post(0).idempotency_key);
    });
  }

  test("AC-20: timeout de 15 s (page.clock) → falla, nunca confirmación; reintentar usa la misma key", async ({
    page,
  }) => {
    const mock = await abrir(page, { ordenes: ["hang", aceptada("RA-48271", 200)] });
    await enviar(page);
    await expect.poll(() => mock.posts.length).toBe(1);
    await page.clock.fastForward(16_000);
    const banner = bannerNoEnviada(page);
    await expect(banner).toBeFocused();
    await expect(page.getByRole("heading", { name: "Tu orden fue enviada a RenovArte" })).toHaveCount(0);
    await banner.getByRole("button", { name: "Reintentar envío" }).click();
    await expect(page.getByText("RA-48271", { exact: true })).toBeVisible();
    expect(mock.post(1).idempotency_key).toBe(mock.post(0).idempotency_key);
  });

  test("AC-22: tope al enviar → sin 'Reintentar', con canales y copiar detalle", async ({ page }) => {
    await abrir(page, { ordenes: [TOPE] });
    await enviar(page);
    const banner = bannerNoEnviada(page);
    await expect(banner).toBeFocused();
    await expect(banner).toContainText("Este mes llegamos al límite de órdenes");
    await expect(banner.getByRole("button", { name: "Reintentar envío" })).toHaveCount(0);
    await expect(banner.getByRole("link", { name: "1130579528" })).toHaveAttribute("href", "tel:1130579528");
    await expect(banner.getByRole("link", { name: "renovartebyjuli@gmail.com" })).toBeVisible();
    await expect(banner.getByRole("link", { name: "@renovarte_by_juli" })).toHaveAttribute("target", "_blank");
    await expect(banner.getByRole("button", { name: "Copiar detalle del pedido" })).toBeVisible();
  });

  test("AC-24: 'Enviando…' en solo lectura y doble clic → un solo POST", async ({ page }) => {
    const mock = await abrir(page, { ordenes: ["hang"] });
    await completar(page);
    await esperarToken(page);
    const btn = page.getByRole("button", { name: "Enviar orden" });
    await btn.dblclick();
    await expect.poll(() => mock.posts.length).toBe(1);

    await expect(page.getByRole("button", { name: "Enviando orden…" })).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText("Estamos enviando tu orden a RenovArte. No cierres esta página.")).toBeVisible();
    await expect(nombreInput(page)).toHaveAttribute("readonly", "");
    await expect(telefonoInput(page)).toHaveAttribute("readonly", "");
    await expect(page.getByRole("button", { name: "Sumar una unidad" }).first()).toBeDisabled();
    await expect(page.getByRole("button", { name: /^Quitar/ }).first()).toBeDisabled();
    await expect(page.getByRole("button", { name: "Vaciar carrito" })).toBeDisabled();
    await expect(page.locator('[role="status"].sr-only')).toHaveText("Enviando tu orden…");

    // Dos clics más sin esperar (Enter en el teléfono también envía): sigue habiendo un solo POST.
    await Promise.all([
      // `aria-disabled` no bloquea eventos: Playwright lo trata como deshabilitado, hay que forzar.
      page.getByRole("button", { name: "Enviando orden…" }).click({ force: true }),
      page.getByRole("button", { name: "Enviando orden…" }).click({ force: true }),
    ]);
    await telefonoInput(page).press("Enter");
    expect(mock.posts).toHaveLength(1);

    mock.release(aceptada());
    await expect(page.getByText("RA-48271", { exact: true })).toBeVisible();
    expect(mock.posts).toHaveLength(1);
  });

  test("AC-24: dos click() sin esperar → un solo POST", async ({ page }) => {
    const mock = await abrir(page, { ordenes: [aceptada()] });
    await completar(page);
    await esperarToken(page);
    const btn = page.getByRole("button", { name: "Enviar orden" });
    await Promise.all([btn.click(), btn.click({ noWaitAfter: true }).catch(() => undefined)]);
    await expect(page.getByText("RA-48271", { exact: true })).toBeVisible();
    expect(mock.posts).toHaveLength(1);
  });

  for (const [codigo, copy] of [
    ["requerido", MENSAJE_NOMBRE_VACIO],
    ["formato", MENSAJE_NOMBRE_INVALIDO],
    ["largo", MENSAJE_NOMBRE_INVALIDO],
  ] as const) {
    test(`un 'invalida' con contacto.nombre '${codigo}' muestra el error del nombre`, async ({ page }) => {
      await abrir(page, { ordenes: [invalida([{ campo: "contacto.nombre", codigo }])] });
      await enviar(page);
      const resumen = page.getByRole("group", { name: "Revisá estos datos antes de enviar:" });
      await expect(resumen).toBeFocused();
      await expect(resumen.getByRole("button", { name: copy })).toBeVisible();
      await expect(nombreInput(page)).toHaveAttribute("aria-invalid", "true");
      await expect(bannerNoEnviada(page)).toHaveCount(0);
    });
  }

  test("nombre o teléfono cambiado tras una falla → key nueva; sin cambios → la misma", async ({ page }) => {
    const mock = await abrir(page, { ordenes: [falla(500)] });
    await enviar(page);
    await expect(bannerNoEnviada(page)).toBeFocused();
    await bannerNoEnviada(page).getByRole("button", { name: "Reintentar envío" }).click();
    await expect.poll(() => mock.posts.length).toBe(2);
    expect(mock.post(1).idempotency_key).toBe(mock.post(0).idempotency_key);

    await expect(bannerNoEnviada(page)).toBeVisible();
    await nombreInput(page).fill("Zulema Otra");
    await bannerNoEnviada(page).getByRole("button", { name: "Reintentar envío" }).click();
    await expect.poll(() => mock.posts.length).toBe(3);
    expect(mock.post(2).idempotency_key).not.toBe(mock.post(1).idempotency_key);

    await expect(bannerNoEnviada(page)).toBeVisible();
    await telefonoInput(page).fill("11 4444 4444");
    await bannerNoEnviada(page).getByRole("button", { name: "Reintentar envío" }).click();
    await expect.poll(() => mock.posts.length).toBe(4);
    expect(mock.post(3).idempotency_key).not.toBe(mock.post(2).idempotency_key);
  });

  test("#L: un 'invalida' general (sin campo mapeable) → el siguiente envío, aun sin cambios, sale con key nueva", async ({
    page,
  }) => {
    const mock = await abrir(page, {
      ordenes: [invalida([]), invalida([{ campo: "total_visto", codigo: "formato" }]), falla(500)],
    });
    await enviar(page);
    const banner = bannerNoEnviada(page);
    await expect(banner).toBeFocused();
    await expect(banner).toContainText("Algo de lo que enviaste no pasó la revisión.");
    await expect(banner.getByRole("button", { name: "Reintentar envío" })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Revisá estos datos antes de enviar:" })).toHaveCount(0);

    await page.getByRole("button", { name: "Enviar orden" }).click();
    await expect.poll(() => mock.posts.length).toBe(2);
    expect(mock.post(1).idempotency_key).not.toBe(mock.post(0).idempotency_key);
    // Mismo trato para `total_visto`/`formato`.
    await expect(banner).toContainText("Algo de lo que enviaste no pasó la revisión.");
    await page.getByRole("button", { name: "Enviar orden" }).click();
    await expect.poll(() => mock.posts.length).toBe(3);
    expect(mock.post(2).idempotency_key).not.toBe(mock.post(1).idempotency_key);
  });

  test("AC-28: 'Copiar detalle del pedido' no contiene el nombre ni el teléfono", async ({ page }) => {
    await abrir(page, { ordenes: [falla(500)] });
    await enviar(page);
    await bannerNoEnviada(page).getByRole("button", { name: "Copiar detalle del pedido" }).click();
    await expect(bannerNoEnviada(page).getByRole("button", { name: "Copiado" })).toBeVisible();
    const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied);
    expect(copied).toHaveLength(1);
    const texto = copied[0];
    expect(texto).toContain("Pedido RenovArte");
    expect(texto).toContain(A.nombre);
    expect(texto).toContain(formatARS(A.precio_venta * 2 + B.precio_venta));
    expect(texto).not.toContain("Zulema");
    expect(texto).not.toContain("Qüintanilla");
    expect(texto).not.toContain("5555");
  });
});

test.describe("F14 — rechazo por catálogo y GET /v1/estado", () => {
  test("AC-15: 409 → aviso enfocado, formulario intacto, y el reenvío sale con key nueva y precio vigente", async ({
    page,
  }) => {
    const nuevo = A.precio_venta + 500;
    const mock = await abrir(
      page,
      {
        ordenes: [
          {
            status: 409,
            body: {
              v: 1,
              resultado: "rechazada_por_catalogo",
              lineas: [{ producto_id: A.id, estado: "precio_cambiado", precio_vigente: nuevo }],
              total_vigente: nuevo * 2 + B.precio_venta,
            },
          },
          aceptada(),
        ],
      },
    );
    await enviar(page);
    const aviso = page
      .getByRole("status")
      .filter({ hasText: "Los precios se actualizaron mientras completabas tus datos." });
    await expect(aviso).toBeFocused();
    await expect(aviso).toContainText("Revisá el total y volvé a enviar la orden.");
    await expect(page.getByRole("list", { name: "Productos en tu carrito" })).toContainText(
      `El precio cambió: antes ${formatARS(A.precio_venta)}, ahora ${formatARS(nuevo)}.`,
    );
    await expect(page.getByLabel("Resumen del carrito", { exact: false }).or(page.locator("section[aria-label='Resumen del carrito']"))).toContainText(
      formatARS(nuevo * 2 + B.precio_venta),
    );
    await expect(nombreInput(page)).toHaveValue(NOMBRE_TIPEADO);
    await expect(telefonoInput(page)).toHaveValue(TELEFONO);

    await page.getByRole("button", { name: "Enviar orden" }).click();
    await expect(page.getByText("RA-48271", { exact: true })).toBeVisible();
    expect(mock.posts).toHaveLength(2);
    expect(mock.post(1).idempotency_key).not.toBe(mock.post(0).idempotency_key);
    expect(mock.post(1).lineas.find((l) => l.producto_id === A.id)?.precio_visto).toBe(nuevo);
    expect(mock.post(1).total_visto).toBe(nuevo * 2 + B.precio_venta);
  });

  test("AC-22: tope al entrar → aviso en lugar del formulario, sin foco, y cero POST", async ({ page }) => {
    const mock = await abrir(page, { estado: { status: 200, body: { v: 1, resultado: "tope_alcanzado" } } });
    const aviso = page.getByRole("status").filter({ hasText: "Por ahora no podemos recibir órdenes desde el sitio" });
    await expect(aviso).toBeVisible();
    await expect(aviso).not.toBeFocused();
    await expect(aviso).toContainText("Este mes llegamos al límite de órdenes que podemos recibir desde el sitio.");
    await expect(aviso.getByRole("button", { name: "Copiar detalle del pedido" })).toBeVisible();
    await expect(aviso.getByText("Para pegarlo en tu mensaje.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar orden" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Tus datos" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reintentar envío" })).toHaveCount(0);
    // Las líneas siguen editables y el total visible.
    await expect(page.getByRole("button", { name: "Sumar una unidad" }).first()).toBeEnabled();
    expect(mock.posts).toHaveLength(0);
  });

  test("GET no_disponible al entrar → formulario visible; al enviar, la renovación del token falla genérica", async ({
    page,
  }) => {
    const mock = await abrir(page, { estado: { status: 200, body: { v: 1, resultado: "no_disponible" } } });
    await expect(page.getByRole("heading", { name: "Tus datos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar orden" })).toBeVisible();
    await completar(page);
    await page.getByRole("button", { name: "Enviar orden" }).click();
    const banner = bannerNoEnviada(page);
    await expect(banner).toBeFocused();
    await expect(banner.getByRole("button", { name: "Reintentar envío" })).toBeVisible();
    expect(mock.posts).toHaveLength(0);
    expect(mock.gets).toBeGreaterThanOrEqual(2);
  });

  test("GET con error de red al entrar → formulario visible, sin cambios", async ({ page }) => {
    await abrir(page, { estado: "abort" });
    await expect(page.getByRole("heading", { name: "Tus datos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar orden" })).toBeVisible();
  });
});

test.describe("F15 — confirmación", () => {
  test("AC-10 / AC-28 / AC-18: 201 sin nombre → confirmación con lo tipeado, storage acotado y limpieza al salir", async ({
    page,
  }) => {
    await abrir(page, { ordenes: [aceptada()] });
    await enviar(page);

    const h1 = page.getByRole("heading", { name: "Tu orden fue enviada a RenovArte", level: 1 });
    await expect(h1).toBeFocused();
    await expect(page.getByText("RA-48271", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copiar número" })).toBeVisible();
    await expect(page.getByText(`RenovArte va a contactar a ${NOMBRE} al ${TELEFONO}`)).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver al catálogo" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "1130579528" })).toHaveAttribute("href", "tel:1130579528");
    await expect(page.getByRole("link", { name: "renovartebyjuli@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:renovartebyjuli@gmail.com?subject=Consulta%20por%20orden%20RA-48271",
    );
    await expect(page.getByRole("link", { name: "@renovarte_by_juli" })).toHaveAttribute(
      "href",
      "https://ig.me/m/renovarte_by_juli",
    );
    // Contador oculto y carrito vaciado.
    await expect(page.locator("header").getByRole("link", { name: /^Carrito/ })).toHaveAccessibleName("Carrito, vacío");
    expect(await page.evaluate((k) => localStorage.getItem(k), CART_KEY)).toBeNull();

    // sessionStorage: solo la confirmación, con nombre y teléfono; sin borrador ni key en curso.
    expect(await sessionKeys(page)).toEqual([CONFIRMATION_KEY]);
    const conf = JSON.parse((await page.evaluate((k) => sessionStorage.getItem(k), CONFIRMATION_KEY))!);
    expect(Object.keys(conf).sort()).toEqual(["lineas", "nombre", "numero_orden", "telefono", "total"]);
    expect(conf.nombre).toBe(NOMBRE);
    expect(conf.telefono).toBe(TELEFONO);
    expect(await sessionKeys(page)).not.toContain(DRAFT_KEY);
    expect(await sessionKeys(page)).not.toContain(ENVIO_KEY);
    // localStorage nunca con datos de contacto.
    const local = JSON.stringify(await page.evaluate(() => ({ ...localStorage })));
    expect(local).not.toContain("Zulema");
    expect(local).not.toContain("5555");

    // Recarga en /carrito → misma confirmación.
    await page.reload();
    await expect(page.getByText("RA-48271", { exact: true })).toBeVisible();
    await expect(page.getByText(`RenovArte va a contactar a ${NOMBRE} al ${TELEFONO}`)).toBeVisible();

    // Página nueva del mismo contexto → sin confirmación.
    const otra = await page.context().newPage();
    await otra.goto("/carrito");
    await expect(otra.getByText("Tu carrito está vacío.")).toBeVisible();
    await expect(otra.getByText("RA-48271")).toHaveCount(0);
    await otra.close();

    // Navegar a / (cliente) → ninguna clave de contacto.
    await page.getByRole("link", { name: "Volver al catálogo" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => sessionKeys(page)).toEqual([]);

    // Carga completa de / → tampoco; y volver a /carrito → vacío.
    await page.goto("/");
    expect(await sessionKeys(page)).toEqual([]);
    await page.goto("/carrito");
    await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
    await expect(page.getByText("RA-48271")).toHaveCount(0);
    expect(await sessionKeys(page)).toEqual([]);
  });

  test("el borrador sigue vivo mientras no se confirma y se borra al salir de /carrito (AC-28)", async ({ page }) => {
    await abrir(page, { ordenes: [falla(500)] });
    await enviar(page);
    await expect(bannerNoEnviada(page)).toBeFocused();
    expect(await sessionKeys(page)).toContain(DRAFT_KEY);
    expect(await sessionKeys(page)).not.toContain(CONFIRMATION_KEY);
    await page.goto("/");
    expect(await sessionKeys(page)).toEqual([]);
  });
});
