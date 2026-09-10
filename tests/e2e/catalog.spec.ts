import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

type SeedProduct = { id: string; nombre: string };

const products = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "public", "data", "products.json"),
    "utf-8",
  ),
) as SeedProduct[];

test("home lists every product with a name and a price (RF-01)", async ({ page }) => {
  await page.goto("/");

  const cards = page.locator("main ul > li");
  await expect(cards).toHaveCount(products.length);

  for (const product of products) {
    const card = page.getByRole("link", { name: product.nombre });
    await expect(card).toBeVisible();
    await expect(card).toContainText("$");
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
  await page.getByRole("link", { name: first.nombre }).click();

  await expect(page).toHaveURL(new RegExp(`/producto/${first.id}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(first.nombre);
  await expect(page.getByRole("main")).toContainText("$");
});

test("unknown product id renders the 404 page", async ({ page }) => {
  const res = await page.goto("/producto/no-such-id");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /no encontrada/i })).toBeVisible();
});
