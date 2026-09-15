import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { slugifyCategoria } from "../../src/lib/category-slug";
import { MISSION_SLIDES } from "../../src/lib/mission-content";
import { matchProducts } from "../../src/lib/search";
import type { Product } from "../../src/lib/types";

const products = JSON.parse(
  readFileSync(path.join(process.cwd(), "public", "data", "products.json"), "utf-8"),
) as Product[];

// A query that matches some but not all products, derived from real data.
const searchQuery =
  [...new Set(products.map((p) => p.nombre.split(/\s+/)[0]!.toLowerCase()))].find(
    (w) => {
      const n = matchProducts(w, products).length;
      return n >= 1 && n < products.length;
    },
  ) ?? "serum";
const searchMatches = matchProducts(searchQuery, products).length;

const categoryCounts = new Map<string, number>();
for (const p of products) {
  categoryCounts.set(p.categoria, (categoryCounts.get(p.categoria) ?? 0) + 1);
}
const [sampleCategoria, sampleCount] = [...categoryCounts.entries()].sort(
  (a, b) => b[1] - a[1],
)[0]!;
const sampleSlug = slugifyCategoria(sampleCategoria);

// The catalog's real longest product name (spec 0013) — not the 33-char
// illustrative example from ux.md, which isn't the actual worst case.
const longestNameProduct = products.reduce((longest, p) =>
  p.nombre.length > longest.nombre.length ? p : longest,
);

test("home lists every product, each with a name and a price (RF-01)", async ({ page }) => {
  await page.goto("/");

  const cards = page.locator("main ul > li");
  await expect(cards).toHaveCount(products.length);

  // Every card links to a product detail and shows a formatted price.
  const detailLinks = page.locator('main ul > li a[href^="/producto/"]');
  await expect(detailLinks).toHaveCount(products.length);
  for (const price of await cards.allInnerTexts()) {
    expect(price).toMatch(/\$/);
  }

  // Spot-check a few specific products by their href (names are not unique).
  for (const product of products.slice(0, 3)) {
    const card = page.locator(`main ul > li a[href="/producto/${product.id}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText(product.nombre);
  }
});

test("home has no horizontal scroll at 390px (RNF-04)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("clicking a card opens its detail page (RF-04)", async ({ page }) => {
  const first = products[0]!;
  await page.goto("/");
  await page.locator(`main ul > li a[href="/producto/${first.id}"]`).click();

  await expect(page).toHaveURL(new RegExp(`/producto/${first.id}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(first.nombre);
  await expect(page.getByRole("main")).toContainText("$");
});

test("unknown product id renders the 404 page", async ({ page }) => {
  const res = await page.goto("/producto/no-such-id");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /no encontrada/i })).toBeVisible();
});

// --- Category filter (spec 0003) ---

test("home shows the category nav (RF-02)", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Categorías" });
  await expect(nav.getByRole("link", { name: "Todos" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("link", { name: sampleCategoria, exact: true })).toBeVisible();
});

test("picking a category filters the grid and marks it active (RF-02, AC-3)", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Categorías" })
    .getByRole("link", { name: sampleCategoria, exact: true })
    .click();

  await expect(page).toHaveURL(new RegExp(`/categoria/${sampleSlug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(sampleCategoria);
  await expect(page.locator("main ul > li")).toHaveCount(sampleCount);

  const activeChip = page
    .getByRole("navigation", { name: "Categorías" })
    .getByRole("link", { name: sampleCategoria, exact: true });
  await expect(activeChip).toHaveAttribute("aria-current", "page");
});

test("unknown category slug renders the 404 page (AC-2)", async ({ page }) => {
  const res = await page.goto("/categoria/no-existe-esta-categoria");
  expect(res?.status()).toBe(404);
});

test("category page has no horizontal scroll at 390px (AC-4)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/categoria/${sampleSlug}`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

// --- Name search (spec 0004) ---

test("typing filters the grid client-side, clearing restores it (RF-03, AC-4)", async ({
  page,
}) => {
  await page.goto("/");
  const cards = page.locator("main ul > li");
  await expect(cards).toHaveCount(products.length);

  const box = page.getByRole("searchbox", { name: "Buscar producto" });
  await box.fill(searchQuery);
  await expect(cards).toHaveCount(searchMatches);
  await expect(cards).not.toHaveCount(products.length);
  await expect(page).toHaveURL(/\/$/); // no navigation — purely client-side
  await expect(page.locator("main")).toContainText(new RegExp(`resultados? para`, "i"));

  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  await expect(cards).toHaveCount(products.length);
});

test("a query with no matches shows the empty state (AC-3)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Buscar producto" }).fill("zzzznoexiste");
  await expect(page.locator("main ul > li")).toHaveCount(0);
  await expect(page.getByText(/no encontramos productos/i)).toBeVisible();
});

test("search inside a category stays within that category (AC-5)", async ({ page }) => {
  await page.goto(`/categoria/${sampleSlug}`);
  const cards = page.locator("main ul > li");
  await expect(cards).toHaveCount(sampleCount);
  await page.getByRole("searchbox", { name: "Buscar producto" }).fill("zzzznoexiste");
  await expect(cards).toHaveCount(0);
  await expect(page.getByText(/no encontramos productos/i)).toBeVisible();
});

// --- Branding (spec 0006) ---

test("home carries brand metadata (AC-3)", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  for (const sel of [
    'meta[property="og:title"]',
    'meta[property="og:image"]',
    'meta[name="twitter:card"]',
    'meta[name="theme-color"]',
  ]) {
    await expect(page.locator(sel)).toHaveCount(1);
  }
});

test("the RenovArte logo is in the header on every route (AC-1)", async ({ page }) => {
  for (const route of ["/", `/categoria/${sampleSlug}`, `/producto/${products[0]!.id}`, "/ofertas"]) {
    await page.goto(route);
    const logo = page.locator("header").getByRole("img", { name: "RenovArte" });
    await expect(logo, route).toBeVisible();
    await expect(page.locator('header a[href="/"]')).toBeVisible();
  }
});

test("no horizontal scroll at 768 and 1280 on home, category and detail (AC-4)", async ({
  page,
}) => {
  const routes = ["/", `/categoria/${sampleSlug}`, `/producto/${products[0]!.id}`];
  for (const width of [768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${route} @ ${width}px`).toBeLessThanOrEqual(1);
    }
  }
});

// --- Offer indicator (spec 0005) ---

const offerProducts = products.filter((p) => p.en_oferta);
const discounted = offerProducts.find((p) => p.precio_regular !== undefined);
const flagOnly = offerProducts.find((p) => p.precio_regular === undefined);

test("offer badge + /ofertas reflect the en_oferta products (RF-05)", async ({ page }) => {
  const nav = () => page.getByRole("navigation", { name: "Categorías" });

  if (offerProducts.length > 0) {
    await page.goto("/");
    await expect(nav().getByRole("link", { name: "Ofertas" })).toBeVisible();

    const first = offerProducts[0]!;
    const card = page.locator(`main ul > li a[href="/producto/${first.id}"]`);
    const badgeText = first.descuento_pct ? `−${first.descuento_pct}%` : "Oferta";
    await expect(card.getByTestId("offer-badge")).toHaveText(badgeText);

    await nav().getByRole("link", { name: "Ofertas" }).click();
    await expect(page).toHaveURL(/\/ofertas$/);
    await expect(page.locator("main ul > li")).toHaveCount(offerProducts.length);
  } else {
    await page.goto("/");
    await expect(nav().getByRole("link", { name: "Ofertas" })).toHaveCount(0);
    const res = await page.goto("/ofertas");
    expect(res?.status()).toBe(200);
    await expect(page.getByText(/no hay ofertas/i)).toBeVisible();
  }
});

// --- Offer pricing: antes / % / ahora (spec 0007) ---

test("card and detail show previous/final price + −N% for a discounted offer (AC-2)", async ({
  page,
}) => {
  test.skip(!discounted, "no discounted offer in the current catalog");
  const p = discounted!;

  await page.goto("/ofertas");
  const card = page.locator(`main ul > li a[href="/producto/${p.id}"]`);
  await expect(card.getByTestId("offer-badge")).toHaveText(`−${p.descuento_pct}%`);
  await expect(card.getByTestId("discount-chip")).toHaveText(`−${p.descuento_pct}%`);
  await expect(card.locator("s")).toContainText(
    p.precio_regular!.toLocaleString("es-AR"),
  );
  await expect(card).toContainText(p.precio_venta.toLocaleString("es-AR"));

  await page.goto(`/producto/${p.id}`);
  await expect(page.getByTestId("offer-badge")).toHaveText(`−${p.descuento_pct}%`);
  await expect(page.getByTestId("discount-chip")).toHaveText(`−${p.descuento_pct}%`);
  await expect(page.locator("main s")).toContainText(
    p.precio_regular!.toLocaleString("es-AR"),
  );
  await expect(page.locator("main")).toContainText(p.precio_venta.toLocaleString("es-AR"));
});

test("a flag-only offer shows the badge but a single price (AC-3)", async ({ page }) => {
  test.skip(!flagOnly, "no flag-only offer in the current catalog");
  const p = flagOnly!;
  await page.goto(`/producto/${p.id}`);
  await expect(page.getByTestId("offer-badge")).toHaveText("Oferta");
  await expect(page.getByTestId("discount-chip")).toHaveCount(0);
  await expect(page.locator("main s")).toHaveCount(0);
});

test("a product with no offer shows a single price, no strikethrough (AC-3)", async ({
  page,
}) => {
  const plain = products.find((p) => !p.en_oferta)!;
  await page.goto(`/producto/${plain.id}`);
  await expect(page.locator("main s")).toHaveCount(0);
  await expect(page.locator("main")).toContainText(plain.precio_venta.toLocaleString("es-AR"));
});

// --- Mission section as the home's first block (spec 0011) ---

test("the mission section is the first block, before the catalog heading (AC-1)", async ({
  page,
}) => {
  await page.goto("/");

  const h1 = page.locator("h1");
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveText(MISSION_SLIDES[0]!.text);

  const headings = await page.locator("h1, h2").allTextContents();
  expect(headings.slice(0, 2)).toEqual([MISSION_SLIDES[0]!.text, "Catálogo"]);

  // The catalog block comes after the mission section in DOM order.
  const order = await page.evaluate(() => {
    const mission = document.querySelector("section");
    const catalogo = document.getElementById("catalogo");
    if (!mission || !catalogo) return null;
    return mission.compareDocumentPosition(catalogo) & Node.DOCUMENT_POSITION_FOLLOWING
      ? "mission-first"
      : "catalog-first";
  });
  expect(order).toBe("mission-first");
});

test("the catalog (heading, nav, grid) stays functional below the mission section (AC-4)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2, name: "Catálogo" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Categorías" })).toBeVisible();
  await expect(page.locator("main ul > li")).toHaveCount(products.length);
});

test("the mission section closes with the RenovArte logo (AC-3)", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("section", { has: page.locator("#mensaje-5") });
  await expect(section.getByRole("img", { name: "RenovArte" })).toHaveCount(1);
});

test("the 5 mission messages and the 5 dots are in the HTML with no JS, no duplicated arrows (AC-7)", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");

  for (const slide of MISSION_SLIDES) {
    await expect(page.getByText(slide.text)).toBeVisible();
  }

  await expect(
    page.getByRole("button", { name: /Mensaje (anterior|siguiente)/ }),
  ).toHaveCount(0);

  await page.locator('a[href="#mensaje-3"]').click();
  await expect(page).toHaveURL(/#mensaje-3$/);
  await expect(page.locator("#mensaje-3")).toBeInViewport();

  await context.close();
});

test("keyboard ArrowRight moves the carousel when the scroll region has focus (AC-7, JS enhancement)", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[role="region"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#mensaje-2")).toBeInViewport();
});

test('"Ver catálogo" CTA scrolls to the catalog heading (AC-8)', async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Ver catálogo/ }).click();
  await expect(page).toHaveURL(/#catalogo$/);
  await expect(
    page.getByRole("heading", { level: 2, name: "Catálogo" }),
  ).toBeInViewport();
});

// --- ProductGrid intrinsic columns + ProductCard body (spec 0013) ---
//
// These measure the rendered DOM (getBoundingClientRect) rather than
// asserting Tailwind class names, because the arbitrary grid-template-columns
// value's resulting column count depends on the real container width at
// runtime, per plan.md.

/**
 * Counts how many `<li>` cards share the topmost row's `top` — i.e. how many
 * columns the grid resolved to at the page's current viewport.
 */
async function countColumns(page: Page): Promise<number> {
  const tops = await page
    .locator("main ul > li")
    .evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().top));
  const firstRowTop = Math.min(...tops);
  return tops.filter((top) => Math.abs(top - firstRowTop) < 1).length;
}

/** Bounding boxes for a card's name (`<h2>`), price block and the card itself. */
async function cardLayout(page: Page, productId: string) {
  const card = page.locator(`main ul > li a[href="/producto/${productId}"]`);
  const nameBox = await card.locator("h2").boundingBox();
  const priceBox = await card.locator('[class~="mt-auto"]').boundingBox();
  const cardBox = await card.boundingBox();
  if (!nameBox || !priceBox || !cardBox) {
    throw new Error(`expected visible name/price/card boxes for product ${productId}`);
  }
  const overflowX = await card.evaluate((el) => el.scrollWidth - el.clientWidth);
  return { card, nameBox, priceBox, cardBox, overflowX };
}

test("a wider viewport resolves more grid columns than a narrower one, driven by container width not a fixed breakpoint (AC-7)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto("/");
  const narrowColumns = await countColumns(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  const wideColumns = await countColumns(page);

  expect(wideColumns).toBeGreaterThan(narrowColumns);
  // Concrete check per plan.md's derivation for max-w-6xl (~1152px content):
  // 5*190 + 4*16 = 1014px fits, 6*190 + 5*16 = 1220px doesn't.
  expect(wideColumns).toBe(5);
});

test("at the ~190px minimum column width, the real longest product name doesn't overlap or truncate the price (AC-8)", async ({
  page,
}) => {
  // Viewport chosen so main's content width (viewport - 32px gutter) lands
  // right at the 2-column threshold (396px -> two ~190px columns).
  await page.setViewportSize({ width: 428, height: 900 });
  await page.goto("/");

  const { nameBox, priceBox, cardBox, overflowX } = await cardLayout(
    page,
    longestNameProduct.id,
  );

  // Card width should be at (or very near) the 190px minmax floor — tolerant
  // range per plan.md "Riesgos" #1 (subpixel/scrollbar rounding), not an
  // exact equality.
  expect(cardBox.width).toBeGreaterThanOrEqual(185);
  expect(cardBox.width).toBeLessThanOrEqual(200);

  expect(nameBox.y + nameBox.height).toBeLessThanOrEqual(priceBox.y + 1);
  expect(overflowX).toBeLessThanOrEqual(1);
});

test("at 390px (mobile), the real longest product name doesn't overlap or truncate the price (AC-4)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const { nameBox, priceBox, overflowX } = await cardLayout(page, longestNameProduct.id);

  expect(nameBox.y + nameBox.height).toBeLessThanOrEqual(priceBox.y + 1);
  expect(overflowX).toBeLessThanOrEqual(1);
});
