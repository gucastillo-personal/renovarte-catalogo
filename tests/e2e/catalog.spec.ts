import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { slugifyCategoria } from "../../src/lib/category-slug";
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

// --- Offer indicator (spec 0005) ---

const offerProducts = products.filter((p) => p.en_oferta);

test("offer badge + /ofertas reflect the en_oferta products (RF-05)", async ({ page }) => {
  const nav = () => page.getByRole("navigation", { name: "Categorías" });

  if (offerProducts.length > 0) {
    await page.goto("/");
    await expect(nav().getByRole("link", { name: "Ofertas" })).toBeVisible();

    const first = offerProducts[0]!;
    const card = page.locator(`main ul > li a[href="/producto/${first.id}"]`);
    await expect(card.getByText("Oferta", { exact: true })).toBeVisible();

    await nav().getByRole("link", { name: "Ofertas" }).click();
    await expect(page).toHaveURL(/\/ofertas$/);
    await expect(page.locator("main ul > li")).toHaveCount(offerProducts.length);
  } else {
    await page.goto("/");
    await expect(nav().getByRole("link", { name: "Ofertas" })).toHaveCount(0);
    await expect(page.locator("main ul > li").getByText("Oferta", { exact: true })).toHaveCount(0);

    const res = await page.goto("/ofertas");
    expect(res?.status()).toBe(200);
    await expect(page.getByText(/no hay ofertas/i)).toBeVisible();
  }
});
