import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { slugifyCategoria } from "@/lib/category-slug";
import {
  categoriaFromSlug,
  getAllProducts,
  getCategories,
  getCategoryList,
  getProductById,
  getProductsByCategoria,
  getProductsOnOffer,
} from "@/lib/products";
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

describe("getCategoryList (spec 0003)", () => {
  it("covers every product exactly once and has unique slugs", () => {
    const list = getCategoryList();
    expect(list.map((c) => c.slug)).toEqual([...new Set(list.map((c) => c.slug))]);
    const total = list.reduce((n, c) => n + c.count, 0);
    expect(total).toBe(getAllProducts().length);
  });

  it("is sorted by name and slugs match slugifyCategoria", () => {
    const list = getCategoryList();
    expect(list.map((c) => c.nombre)).toEqual(
      [...list.map((c) => c.nombre)].sort((a, b) => a.localeCompare(b, "es")),
    );
    for (const c of list) expect(c.slug).toBe(slugifyCategoria(c.nombre));
  });
});

describe("categoriaFromSlug", () => {
  it("round-trips every category", () => {
    for (const c of getCategoryList()) {
      expect(categoriaFromSlug(c.slug)).toBe(c.nombre);
    }
  });
  it("returns undefined for an unknown slug", () => {
    expect(categoriaFromSlug("no-existe-esta-categoria")).toBeUndefined();
  });
});

describe("getProductsByCategoria", () => {
  it("returns exactly the products of that category", () => {
    const { nombre, count } = getCategoryList()[0]!;
    const products = getProductsByCategoria(nombre);
    expect(products).toHaveLength(count);
    expect(products.every((p) => p.categoria === nombre)).toBe(true);
  });
  it("returns [] for an unknown category", () => {
    expect(getProductsByCategoria("Categoría Inexistente")).toEqual([]);
  });
});

describe("getProductsOnOffer (spec 0005)", () => {
  it("returns exactly the en_oferta products", () => {
    const onOffer = getProductsOnOffer();
    expect(onOffer.every((p) => p.en_oferta === true)).toBe(true);
    expect(onOffer).toHaveLength(getAllProducts().filter((p) => p.en_oferta).length);
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
