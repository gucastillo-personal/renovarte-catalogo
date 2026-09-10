import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getAllProducts, getCategories, getProductById } from "@/lib/products";
import { PRODUCT_KEYS } from "@/lib/types";

describe("getAllProducts", () => {
  it("loads every seed product", () => {
    expect(getAllProducts().length).toBeGreaterThanOrEqual(3);
  });

  it("returns products sorted by nombre (es)", () => {
    const names = getAllProducts().map((p) => p.nombre);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "es"));
    expect(names).toEqual(sorted);
  });
});

describe("getProductById", () => {
  it("finds an existing product", () => {
    const first = getAllProducts()[0]!;
    expect(getProductById(first.id)?.nombre).toBe(first.nombre);
  });

  it("returns undefined for an unknown id", () => {
    expect(getProductById("does-not-exist")).toBeUndefined();
  });
});

describe("getCategories", () => {
  it("returns distinct sorted categories", () => {
    const cats = getCategories();
    expect(new Set(cats).size).toBe(cats.length);
    expect(cats).toEqual([...cats].sort((a, b) => a.localeCompare(b, "es")));
  });
});

describe("public/data/products.json (guards RNF-03 / RFC §2.4)", () => {
  const raw: unknown = JSON.parse(
    readFileSync(
      path.join(process.cwd(), "public", "data", "products.json"),
      "utf-8",
    ),
  );

  it("is an array of objects with exactly the RFC §2.4 keys", () => {
    expect(Array.isArray(raw)).toBe(true);
    const allowed = new Set<string>(PRODUCT_KEYS);
    for (const row of raw as Record<string, unknown>[]) {
      expect(new Set(Object.keys(row))).toEqual(allowed);
    }
  });

  it("carries no cost / margin fields", () => {
    const forbidden = ["costo", "precio_costo", "margen", "margin_percent", "precio_publico_laca"];
    for (const row of raw as Record<string, unknown>[]) {
      for (const key of forbidden) {
        expect(row).not.toHaveProperty(key);
      }
    }
  });
});
