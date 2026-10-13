import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { slugifyCategoria } from "../../src/lib/category-slug";
import { formatARS } from "../../src/lib/format";
import type { Product } from "../../src/lib/types";

/**
 * spec 0017 — carrito e2e (F7 ficha, F8 `/carrito`, F9 edición). No hay
 * servicio de órdenes en estas tareas: el envío llega en F10 en adelante.
 *
 * Los datos salen de `public/data/products.json` (como `catalog.spec.ts`), no
 * de ids ni nombres fijos, para no romperse con el próximo refresco del
 * pipeline. El carrito se siembra en `localStorage` con la misma forma que
 * persiste `src/lib/cart/model.ts` (clave y versión versionadas).
 */

const CART_KEY = "renovarte:carrito:v1";
const MAX = 10;

const products = JSON.parse(
  readFileSync(path.join(process.cwd(), "public", "data", "products.json"), "utf-8"),
) as Product[];

const groupNames = JSON.parse(
  readFileSync(path.join(process.cwd(), "public", "data", "serlaca_category_groups.json"), "utf-8"),
) as Record<string, string>;

// Productos con nombre único y presentación (la línea sin presentación omite el separador).
const nameCount = new Map<string, number>();
for (const p of products) nameCount.set(p.nombre, (nameCount.get(p.nombre) ?? 0) + 1);
const sample = products.filter((p) => nameCount.get(p.nombre) === 1 && p.presentacion.trim() !== "");
const [A, B, C] = sample as [Product, Product, Product];

interface SeedLine {
  p: Product;
  cantidad: number;
  /** Para sembrar un precio viejo. */
  precio?: number;
}

function stored(lines: SeedLine[]): string {
  return JSON.stringify({
    v: 1,
    lines: lines.map(({ p, cantidad, precio }) => ({
      producto_id: p.id,
      cantidad,
      precio_visto: precio ?? p.precio_venta,
      nombre: p.nombre,
      presentacion: p.presentacion,
      imagen: p.imagen,
    })),
  });
}

/** Siembra `localStorage` en el origen del sitio sin pasar por la UI. */
async function seedRaw(page: Page, raw: string) {
  await page.goto("/");
  await page.evaluate(([k, v]) => localStorage.setItem(k as string, v as string), [CART_KEY, raw]);
}

const seed = (page: Page, lines: SeedLine[]) => seedRaw(page, stored(lines));

const headerCart = (page: Page) => page.locator("header").getByRole("link", { name: /^Carrito/ });
const cartList = (page: Page) => page.getByRole("list", { name: "Productos en tu carrito" });
const stepper = (page: Page, p: Product) => page.getByRole("group", { name: `Cantidad de ${p.nombre}` });
const siteAnnouncement = (page: Page) => page.locator('[role="status"].sr-only');

async function counted(page: Page, p: Product): Promise<string> {
  return (await stepper(page, p).locator("output").textContent()) ?? "";
}

test.describe("F7 — AddToCartButton en la ficha", () => {
  test("AC-1: agregar desde la ficha deja en /carrito el mismo nombre, presentación y precio", async ({ page }) => {
    await page.goto(`/producto/${A.id}`);
    await expect(page.locator("article")).toContainText(formatARS(A.precio_venta));
    const add = page.getByRole("button", { name: "Agregar al carrito" });
    await expect(add).toBeVisible();

    await add.click();
    await expect(page.getByText("✓ En tu carrito: 1")).toBeVisible();
    await expect(add).toBeFocused();
    await expect(siteAnnouncement(page)).toHaveText(`Agregaste ${A.nombre} al carrito. En tu carrito: 1.`);

    await page.getByRole("link", { name: "Ver carrito" }).click();
    await expect(page).toHaveURL(/\/carrito$/);
    const item = cartList(page).getByRole("listitem");
    await expect(item).toHaveCount(1);
    await expect(item).toContainText(A.nombre);
    await expect(item).toContainText(A.presentacion);
    await expect(item).toContainText(`${formatARS(A.precio_venta)} c/u`);
  });

  test("AC-4: dos toques suman en la misma línea (× 2), sin duplicarla", async ({ page }) => {
    await page.goto(`/producto/${A.id}`);
    const add = page.getByRole("button", { name: "Agregar al carrito" });
    await add.click();
    await add.click();
    await expect(page.getByText("✓ En tu carrito: 2")).toBeVisible();
    await expect(headerCart(page)).toHaveAccessibleName("Carrito, 2 productos");

    await page.goto("/carrito");
    await expect(cartList(page).getByRole("listitem")).toHaveCount(1);
    expect(await counted(page, A)).toBe("2");
    await expect(cartList(page)).toContainText(formatARS(A.precio_venta * 2));
  });

  test("la línea de estado refleja la cantidad real al volver a la ficha y tras editar en el carrito", async ({
    page,
  }) => {
    await seed(page, [{ p: A, cantidad: 3 }]);
    await page.goto(`/producto/${A.id}`);
    await expect(page.getByText("✓ En tu carrito: 3")).toBeVisible();

    await page.goto("/carrito");
    await stepper(page, A).getByRole("button", { name: "Sumar una unidad" }).click();
    await page.goto(`/producto/${A.id}`);
    await expect(page.getByText("✓ En tu carrito: 4")).toBeVisible();
  });

  test("Q-F2c: con la línea en 10 el botón no suma, sigue activo, con foco y con la nota", async ({ page }) => {
    await seed(page, [{ p: A, cantidad: MAX - 1 }]);
    await page.goto(`/producto/${A.id}`);
    const add = page.getByRole("button", { name: "Agregar al carrito" });
    const nota = page.getByText(
      "Máximo 10 unidades por producto. Si necesitás más, contalo cuando RenovArte te contacte.",
    );
    await expect(nota).toHaveCount(0);

    // El toque 9 → 10 ya muestra la nota (depende del estado, no del toque).
    await add.click();
    await expect(page.getByText("✓ En tu carrito: 10")).toBeVisible();
    await expect(nota).toBeVisible();
    await expect(headerCart(page)).toHaveAccessibleName("Carrito, 10 productos");

    // Otro toque: no cambia nada, el botón no se deshabilita y no pierde el foco.
    await add.click();
    await expect(add).toBeEnabled();
    await expect(add).toBeFocused();
    await expect(page.getByText("✓ En tu carrito: 10")).toBeVisible();
    await expect(nota).toBeVisible();
    await expect(headerCart(page)).toHaveAccessibleName("Carrito, 10 productos");
    await expect(siteAnnouncement(page)).toHaveText(
      new RegExp(`^${escape(A.nombre)} ya está en el máximo de 10 unidades\\. No se agregó otra\\.`),
    );

    // La nota sigue al volver a la ficha con la línea en 10.
    await page.reload();
    await expect(nota).toBeVisible();
  });

  test("AC-2: el link al carrito y el contador están en home, categoría, grupo, ofertas y ficha, también tras scrollear", async ({
    page,
  }) => {
    await seed(page, [
      { p: A, cantidad: 2 },
      { p: B, cantidad: 1 },
    ]);
    const categoria = slugifyCategoria(A.categoria);
    const grupoId = A.codCategoria?.find((id) => groupNames[id] !== undefined);
    const urls = [
      "/",
      `/categoria/${categoria}`,
      ...(grupoId ? [`/grupo/${slugifyCategoria(groupNames[grupoId]!)}`] : []),
      "/ofertas",
      `/producto/${A.id}`,
    ];
    for (const url of urls) {
      await page.goto(url);
      const link = headerCart(page);
      await expect(link, url).toHaveAccessibleName("Carrito, 3 productos");
      await expect(link, url).toHaveAttribute("href", "/carrito");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(link, `${url} (scrolleado)`).toBeInViewport();
    }
  });
});

test.describe("F8 — página /carrito", () => {
  test("título, noindex y h1; vacío ofrece el catálogo y ningún formulario (AC-8)", async ({ page }) => {
    await page.goto("/carrito");
    await expect(page).toHaveTitle("Tu carrito — RenovArte");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 1, name: "Tu carrito" })).toBeVisible();
    await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver catálogo" })).toHaveAttribute("href", "/#catalogo");
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Enviar orden/ })).toHaveCount(0);
    await expect(headerCart(page)).toHaveAccessibleName("Carrito, vacío");
  });

  test("vacío: pedirle un combo a Colibrí abre el chat", async ({ page }) => {
    await page.goto("/carrito");
    await page.getByRole("button", { name: "¿No sabés qué elegir? Pedile un combo a Colibrí" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("aria-current=page en el acceso del header, solo en /carrito", async ({ page }) => {
    await page.goto("/");
    await expect(headerCart(page)).not.toHaveAttribute("aria-current", "page");
    await headerCart(page).click();
    await expect(page).toHaveURL(/\/carrito$/);
    await expect(headerCart(page)).toHaveAttribute("aria-current", "page");
  });

  test("AC-5: el carrito sobrevive a recargar y a navegar por el sitio", async ({ page }) => {
    await page.goto(`/producto/${A.id}`);
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await page.getByRole("link", { name: "Ver carrito" }).click();
    await expect(cartList(page)).toContainText(A.nombre);

    await page.reload();
    await expect(cartList(page)).toContainText(A.nombre);

    // ficha → catálogo → carrito, con navegación del cliente.
    await page.getByRole("link", { name: "← Seguir comprando" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(headerCart(page)).toHaveAccessibleName("Carrito, 1 producto");
    await headerCart(page).click();
    await expect(cartList(page)).toContainText(A.nombre);
  });

  test("con productos: líneas, total, aclaración de AC-12 y sin formulario todavía", async ({ page }) => {
    await seed(page, [
      { p: A, cantidad: 2 },
      { p: B, cantidad: 1 },
    ]);
    await page.goto("/carrito");
    await expect(cartList(page).getByRole("listitem")).toHaveCount(2);
    await expect(page.getByText("3 productos").first()).toBeVisible();
    const total = A.precio_venta * 2 + B.precio_venta;
    await expect(page.getByRole("region", { name: "Resumen del carrito" })).toContainText(
      `Total (3 productos)`,
    );
    await expect(page.getByRole("region", { name: "Resumen del carrito" })).toContainText(formatARS(total));
    await expect(page.getByText("No se cobra nada en este paso.")).toBeVisible();
    await expect(page.getByRole("link", { name: A.nombre })).toHaveAttribute("href", `/producto/${A.id}`);
    await expect(page.locator("form")).toHaveCount(0);
  });

  test("AC-15: un precio viejo se actualiza al vigente con aviso y nota", async ({ page }) => {
    const viejo = A.precio_venta + 500;
    await seed(page, [
      { p: A, cantidad: 2, precio: viejo },
      { p: B, cantidad: 1 },
    ]);
    await page.goto("/carrito");

    const aviso = page.getByRole("status").filter({ hasText: "Actualizamos tu carrito con el catálogo vigente." });
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText("1 precio cambió desde que lo agregaste.");
    await expect(page.getByText(`El precio cambió: antes ${formatARS(viejo)}, ahora ${formatARS(A.precio_venta)}.`)).toBeVisible();
    // El total usa el precio vigente.
    await expect(page.getByRole("region", { name: "Resumen del carrito" })).toContainText(
      formatARS(A.precio_venta * 2 + B.precio_venta),
    );
    // Quedó persistido al vigente: sin cambio nuevo, la próxima visita no avisa (sigue habiendo aviso solo por cambios reales).
    const guardado = await page.evaluate((k) => localStorage.getItem(k), CART_KEY);
    expect(JSON.parse(guardado!).lines[0].precio_visto).toBe(A.precio_venta);
  });

  test("AC-15: un id que ya no existe queda atenuado, sin precio, sin stepper y sin sumar", async ({ page }) => {
    const fantasma = { ...A, id: "no-existe-999", nombre: "Producto Retirado Del Catalogo" } as Product;
    await seed(page, [
      { p: B, cantidad: 1 },
      { p: fantasma, cantidad: 4 },
    ]);
    await page.goto("/carrito");

    const aviso = page.getByRole("status").filter({ hasText: "Actualizamos tu carrito con el catálogo vigente." });
    await expect(aviso).toContainText(
      "1 producto ya no está en el catálogo y no se va a incluir en la orden.",
    );
    const item = cartList(page).getByRole("listitem").filter({ hasText: fantasma.nombre });
    await expect(item).toContainText("Ya no está en el catálogo");
    await expect(item).toContainText("No se incluye en la orden");
    await expect(item.getByRole("group")).toHaveCount(0);
    await expect(item.getByRole("link")).toHaveCount(0);
    await expect(item.getByRole("button")).toHaveCount(1);

    // No suma al contador (header y página) ni al total.
    await expect(headerCart(page)).toHaveAccessibleName("Carrito, 1 producto");
    const resumen = page.getByRole("region", { name: "Resumen del carrito" });
    await expect(resumen).toContainText("Total (1 producto)");
    await expect(resumen).toContainText(formatARS(B.precio_venta));

    // Se puede quitar, y el aviso desaparece con la línea.
    await item.getByRole("button", { name: /^Quitar/ }).click();
    await expect(aviso).toHaveCount(0);
  });

  test("solo líneas no disponibles: el texto reemplaza al formulario y no hay envío", async ({ page }) => {
    const fantasma = { ...A, id: "no-existe-998", nombre: "Otro Retirado" } as Product;
    await seed(page, [{ p: fantasma, cantidad: 1 }]);
    await page.goto("/carrito");
    await expect(
      page.getByText(
        "No hay productos disponibles para generar una orden. Quitá los que ya no están y agregá otros desde el catálogo.",
      ),
    ).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
    await expect(headerCart(page)).toHaveAccessibleName("Carrito, vacío");
  });

  test("carrito corrupto en localStorage se trata como vacío sin romper la página", async ({ page }) => {
    await seedRaw(page, "{esto no es json");
    await page.goto("/carrito");
    await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
  });

  test("dos columnas desde md, con el resumen sticky bajo el header; una en móvil", async ({ page }) => {
    await seed(page, [{ p: A, cantidad: 1 }]);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/carrito");
    const resumen = page.getByRole("region", { name: "Resumen del carrito" });
    const lista = cartList(page);
    const [rb, lb] = [(await resumen.boundingBox())!, (await lista.boundingBox())!];
    expect(rb.x).toBeGreaterThan(lb.x + lb.width - 1); // columna derecha
    expect(rb.width).toBeCloseTo(380, 0);
    const wrapper = resumen.locator("..");
    expect(await wrapper.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
    expect(await wrapper.evaluate((el) => getComputedStyle(el).top)).toBe("88px");

    await page.setViewportSize({ width: 390, height: 800 });
    const [rm, lm] = [(await resumen.boundingBox())!, (await lista.boundingBox())!];
    expect(rm.y).toBeGreaterThan(lm.y + lm.height - 1); // debajo de las líneas
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("padding inferior de la página >= 104px sobre el footer", async ({ page }) => {
    await seed(page, [{ p: A, cantidad: 1 }]);
    await page.goto("/carrito");
    const gap = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      const content = main.firstElementChild as HTMLElement;
      const inner = parseFloat(getComputedStyle(content).paddingBottom);
      const outer = parseFloat(getComputedStyle(main).paddingBottom);
      return inner + outer;
    });
    expect(gap).toBeGreaterThanOrEqual(104);
  });
});

test.describe("F9 — edición del carrito (AC-3)", () => {
  test("+ y −: la cantidad, el subtotal y el total se recalculan, y el foco queda en el botón", async ({
    page,
  }) => {
    await seed(page, [
      { p: A, cantidad: 2 },
      { p: B, cantidad: 1 },
    ]);
    await page.goto("/carrito");
    const resumen = page.getByRole("region", { name: "Resumen del carrito" });

    const mas = stepper(page, A).getByRole("button", { name: "Sumar una unidad" });
    await mas.click();
    expect(await counted(page, A)).toBe("3");
    await expect(mas).toBeFocused();
    await expect(resumen).toContainText(formatARS(A.precio_venta * 3 + B.precio_venta));
    await expect(cartList(page).getByRole("listitem").first()).toContainText(formatARS(A.precio_venta * 3));
    await expect(headerCart(page)).toHaveAccessibleName("Carrito, 4 productos");
    await expect(siteAnnouncement(page)).toHaveText(
      `${A.nombre}: 3 unidades. Total ${formatARS(A.precio_venta * 3 + B.precio_venta)}.`,
    );

    const menos = stepper(page, A).getByRole("button", { name: "Restar una unidad" });
    await menos.click();
    await menos.click();
    expect(await counted(page, A)).toBe("1");
    await expect(resumen).toContainText(formatARS(A.precio_venta + B.precio_venta));
  });

  test('"−" se deshabilita en 1 y el foco pasa al "+"', async ({ page }) => {
    await seed(page, [{ p: A, cantidad: 2 }]);
    await page.goto("/carrito");
    const menos = stepper(page, A).getByRole("button", { name: "Restar una unidad" });
    const mas = stepper(page, A).getByRole("button", { name: "Sumar una unidad" });
    await menos.click();
    expect(await counted(page, A)).toBe("1");
    await expect(menos).toBeDisabled();
    await expect(mas).toBeFocused();
  });

  test('"+" se deshabilita en 10 con nota y el foco pasa al "−"; al bajar a 9 vuelve todo', async ({ page }) => {
    await seed(page, [{ p: A, cantidad: MAX - 1 }]);
    await page.goto("/carrito");
    const nota = page.getByText(
      "Máximo 10 unidades por producto. Si necesitás más, contalo cuando RenovArte te contacte.",
    );
    const menos = stepper(page, A).getByRole("button", { name: "Restar una unidad" });
    const mas = stepper(page, A).getByRole("button", { name: "Sumar una unidad" });
    await expect(nota).toHaveCount(0);

    await mas.click();
    expect(await counted(page, A)).toBe("10");
    await expect(mas).toBeDisabled();
    await expect(menos).toBeFocused();
    await expect(nota).toBeVisible();
    await expect(siteAnnouncement(page)).toContainText("10 unidades.");
    await expect(siteAnnouncement(page)).toContainText("Es el máximo por producto.");
    // No es una live region: el cambio se anuncia desde la región del sitio.
    expect(await nota.evaluate((el) => el.closest("[aria-live], [role='status']"))).toBeNull();

    await menos.click();
    expect(await counted(page, A)).toBe("9");
    await expect(mas).toBeEnabled();
    await expect(nota).toHaveCount(0);
  });

  test("la nota del máximo va en la línea que llegó a 10, no en las demás", async ({ page }) => {
    await seed(page, [
      { p: A, cantidad: MAX },
      { p: B, cantidad: 2 },
    ]);
    await page.goto("/carrito");
    const items = cartList(page).getByRole("listitem");
    await expect(items.filter({ hasText: A.nombre })).toContainText("Máximo 10 unidades por producto.");
    await expect(items.filter({ hasText: B.nombre })).not.toContainText("Máximo 10");
  });

  test("Quitar → Deshacer: la fila ocupa el lugar de la línea y la restaura en la misma posición", async ({
    page,
  }) => {
    await seed(page, [
      { p: A, cantidad: 1 },
      { p: B, cantidad: 2 },
      { p: C, cantidad: 1 },
    ]);
    await page.goto("/carrito");
    const items = cartList(page).getByRole("listitem");

    await page.getByRole("button", { name: `Quitar ${B.nombre}` }).click();
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText(A.nombre);
    await expect(items.nth(1)).toContainText(`Quitaste ${B.nombre}.`);
    await expect(items.nth(2)).toContainText(C.nombre);
    const deshacer = page.getByRole("button", { name: "Deshacer" });
    await expect(deshacer).toBeFocused();
    await expect(siteAnnouncement(page)).toHaveText(
      `Quitaste ${B.nombre} del carrito. Total ${formatARS(A.precio_venta + C.precio_venta)}.`,
    );
    await expect(headerCart(page)).toHaveAccessibleName("Carrito, 2 productos");

    await deshacer.click();
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText(A.nombre);
    await expect(items.nth(1)).toContainText(B.nombre);
    await expect(items.nth(2)).toContainText(C.nombre);
    expect(await counted(page, B)).toBe("2");
    await expect(page.getByRole("button", { name: `Quitar ${B.nombre}` })).toBeFocused();
    await expect(headerCart(page)).toHaveAccessibleName("Carrito, 4 productos");
  });

  test("la fila de deshacer se va con la próxima acción del carrito", async ({ page }) => {
    await seed(page, [
      { p: A, cantidad: 1 },
      { p: B, cantidad: 1 },
    ]);
    await page.goto("/carrito");
    await page.getByRole("button", { name: `Quitar ${A.nombre}` }).click();
    await expect(page.getByText(`Quitaste ${A.nombre}.`)).toBeVisible();
    await stepper(page, B).getByRole("button", { name: "Sumar una unidad" }).click();
    await expect(page.getByText(`Quitaste ${A.nombre}.`)).toHaveCount(0);
  });

  test("quitar la última línea deja la fila de deshacer y el estado vacío, y Deshacer la trae de vuelta", async ({
    page,
  }) => {
    await seed(page, [{ p: A, cantidad: 1 }]);
    await page.goto("/carrito");
    await page.getByRole("button", { name: `Quitar ${A.nombre}` }).click();
    await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Deshacer" })).toBeFocused();
    await expect(page.getByRole("region", { name: "Resumen del carrito" })).toHaveCount(0);
    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(cartList(page)).toContainText(A.nombre);
    await expect(page.getByText("Tu carrito está vacío.")).toHaveCount(0);
  });

  test("Vaciar: pide confirmación en el lugar, con foco en Cancelar; Cancelar no borra nada", async ({
    page,
  }) => {
    await seed(page, [
      { p: A, cantidad: 1 },
      { p: B, cantidad: 1 },
    ]);
    await page.goto("/carrito");
    await page.getByRole("button", { name: "Vaciar carrito" }).click();
    await expect(page.getByText("¿Vaciar el carrito?")).toBeVisible();
    await expect(page.getByText("Se quitan todos los productos.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await expect(cartList(page).getByRole("listitem")).toHaveCount(2);

    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText("¿Vaciar el carrito?")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Vaciar carrito" })).toBeFocused();
    await expect(cartList(page).getByRole("listitem")).toHaveCount(2);
  });

  test('Vaciar → "Sí, vaciar": estado vacío, foco en el h1, anuncio y contador en cero', async ({ page }) => {
    await seed(page, [
      { p: A, cantidad: 2 },
      { p: B, cantidad: 1 },
    ]);
    await page.goto("/carrito");
    await page.getByRole("button", { name: "Vaciar carrito" }).click();
    await page.getByRole("button", { name: "Sí, vaciar" }).click();

    await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Tu carrito" })).toBeFocused();
    await expect(siteAnnouncement(page)).toHaveText("Vaciaste el carrito.");
    await expect(headerCart(page)).toHaveAccessibleName("Carrito, vacío");
    await expect(page.locator("form")).toHaveCount(0);

    await page.reload();
    await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), CART_KEY)).toBeNull();
  });

  test("AC-5: una segunda pestaña actualiza su contador al editar en la primera", async ({ context }) => {
    const uno = await context.newPage();
    const dos = await context.newPage();
    await seed(uno, [{ p: A, cantidad: 1 }]);
    await dos.goto("/");
    await expect(headerCart(dos)).toHaveAccessibleName("Carrito, 1 producto");

    await uno.goto("/carrito");
    await stepper(uno, A).getByRole("button", { name: "Sumar una unidad" }).click();
    await expect(headerCart(dos)).toHaveAccessibleName("Carrito, 2 productos");

    await uno.getByRole("button", { name: "Vaciar carrito" }).click();
    await uno.getByRole("button", { name: "Sí, vaciar" }).click();
    await expect(headerCart(dos)).toHaveAccessibleName("Carrito, vacío");
  });
});

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
