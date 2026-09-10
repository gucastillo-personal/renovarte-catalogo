import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

type CatalogProduct = { id: string; nombre: string };

const products = JSON.parse(
  readFileSync(path.join(process.cwd(), "public", "data", "products.json"), "utf-8"),
) as CatalogProduct[];

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
