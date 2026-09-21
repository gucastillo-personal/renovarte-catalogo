import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { slugifyCategoria } from "@/lib/category-slug";
import {
  categoriaFromSlug,
  codCategoriasOf,
  deriveCategoriaGrupoMap,
  deriveGroupList,
  getAllProducts,
  getCategories,
  getCategoriaGrupos,
  getCategoryList,
  getCategoryListForGrupos,
  getGroupList,
  getGrupoNombre,
  getGrupoSlug,
  getProductById,
  getProductsByCategoria,
  getProductsByGrupo,
  getProductsOnOffer,
  grupoFromSlug,
} from "@/lib/products";
import { PRODUCT_KEYS, REQUIRED_PRODUCT_KEYS, type Product } from "@/lib/types";

// Minimal in-memory fixture, spec 0015 — never touches public/data/products.json.
function fixtureProduct(overrides: Partial<Product>): Product {
  return {
    id: "id",
    proveedor: "LACA",
    categoria: "Antiage",
    nombre: "Producto",
    presentacion: "50 g",
    descripcion: "desc",
    precio_venta: 1000,
    imagen: "/img/laca/1.svg",
    en_oferta: false,
    tags: [],
    ...overrides,
  };
}

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

// --- High-level category groups (spec 0015 — RF-13), Fase 1 ---
//
// Pure functions tested with in-memory fixtures (never touch
// public/data/products.json or public/data/serlaca_category_groups.json).
// codCategoria is now an array (renovarte-pipeline spec 0001, closed
// 2026-09-18) — a product, and therefore a categoria, can belong to more
// than one group at once (ux.md "Multi-grupo"), so these fixtures cover
// 0/1/2+ ids per product, not the old single-id majority vote.

describe("codCategoriasOf", () => {
  it("returns [] when codCategoria is absent", () => {
    expect(codCategoriasOf(fixtureProduct({}))).toEqual([]);
  });

  it("returns [] when codCategoria is an empty array", () => {
    expect(codCategoriasOf(fixtureProduct({ codCategoria: [] }))).toEqual([]);
  });

  it("drops unrecognized ids, keeps recognized ones", () => {
    expect(codCategoriasOf(fixtureProduct({ codCategoria: ["9", "1"] }))).toEqual(["1"]);
  });

  it("dedupes and sorts in business order regardless of input order", () => {
    expect(codCategoriasOf(fixtureProduct({ codCategoria: ["3", "1", "1", "2"] }))).toEqual([
      "1",
      "2",
      "3",
    ]);
  });
});

describe("deriveCategoriaGrupoMap", () => {
  it("maps a categoria to every group any of its products belong to (union, not a vote)", () => {
    const products = [
      fixtureProduct({ id: "1", categoria: "Antiage", codCategoria: ["1"] }),
      fixtureProduct({ id: "2", categoria: "Antiage", codCategoria: ["1"] }),
      fixtureProduct({ id: "3", categoria: "Antiage", codCategoria: ["2"] }),
      fixtureProduct({ id: "4", categoria: "Uñas", codCategoria: ["3"] }),
    ];
    const map = deriveCategoriaGrupoMap(products);
    expect(map.get("Antiage")).toEqual(["1", "2"]);
    expect(map.get("Uñas")).toEqual(["3"]);
  });

  it("a single product with 2 ids puts its categoria in both groups", () => {
    const products = [
      fixtureProduct({ id: "1", categoria: "Antiage", codCategoria: ["1", "2"] }),
    ];
    expect(deriveCategoriaGrupoMap(products).get("Antiage")).toEqual(["1", "2"]);
  });

  it("doesn't count products with absent or unrecognized codCategoria", () => {
    const products = [
      fixtureProduct({ id: "1", categoria: "Uñas", codCategoria: undefined }),
      fixtureProduct({ id: "2", categoria: "Uñas", codCategoria: ["9"] }),
      fixtureProduct({ id: "3", categoria: "Uñas", codCategoria: [] }),
    ];
    expect(deriveCategoriaGrupoMap(products).has("Uñas")).toBe(false);
  });
});

describe("deriveGroupList", () => {
  const groupNames = { "1": "Cuidado facial", "2": "Cuidado corporal", "3": "Cosmética" };

  it("counts products per group correctly", () => {
    const products = [
      fixtureProduct({ id: "1", codCategoria: ["1"] }),
      fixtureProduct({ id: "2", codCategoria: ["1"] }),
      fixtureProduct({ id: "3", codCategoria: ["2"] }),
    ];
    const list = deriveGroupList(products, groupNames);
    expect(list.find((g) => g.codCategoria === "1")?.count).toBe(2);
    expect(list.find((g) => g.codCategoria === "2")?.count).toBe(1);
  });

  it("a product with 2+ ids counts once for each group (counts can overlap — ux.md)", () => {
    const products = [
      fixtureProduct({ id: "1", codCategoria: ["1", "2"] }),
      fixtureProduct({ id: "2", codCategoria: ["1"] }),
    ];
    const list = deriveGroupList(products, groupNames);
    expect(list.find((g) => g.codCategoria === "1")?.count).toBe(2);
    expect(list.find((g) => g.codCategoria === "2")?.count).toBe(1);
    // Sum of counts (3) exceeds products.length (2) — expected, not a bug.
    const total = list.reduce((n, g) => n + g.count, 0);
    expect(total).toBeGreaterThan(products.length);
  });

  it("orders entries 1 -> 2 -> 3 -> 4 (fixed business order, not alphabetical)", () => {
    const products = [
      fixtureProduct({ id: "1", codCategoria: ["3"] }),
      fixtureProduct({ id: "2", codCategoria: ["1"] }),
      fixtureProduct({ id: "3", codCategoria: ["2"] }),
    ];
    const list = deriveGroupList(products, groupNames);
    expect(list.map((g) => g.codCategoria)).toEqual(["1", "2", "3"]);
  });

  it("omits a group with 0 products", () => {
    const products = [fixtureProduct({ id: "1", codCategoria: ["1"] })];
    const list = deriveGroupList(products, groupNames);
    expect(list.map((g) => g.codCategoria)).toEqual(["1"]);
  });

  it("falls back to the raw id when groupNames doesn't resolve that key", () => {
    const products = [fixtureProduct({ id: "1", codCategoria: ["4"] })];
    const list = deriveGroupList(products, groupNames); // groupNames has no "4"
    expect(list[0]).toMatchObject({ codCategoria: "4", nombre: "4" });
  });
});

// --- Wrappers against today's real files (Fase 1 regression) ---
//
// public/data/products.json has no codCategoria yet (Fase 2 — the PR from
// renovarte-pipeline with real data — hasn't merged) and
// public/data/serlaca_category_groups.json doesn't exist yet — every
// wrapper must degrade gracefully (no throw) instead of hiding products
// (AC-6).

describe("group wrappers (spec 0015) — against today's data (no codCategoria yet)", () => {
  it("getGroupList returns []", () => {
    expect(getGroupList()).toEqual([]);
  });

  it("grupoFromSlug returns undefined for any slug", () => {
    expect(grupoFromSlug("cuidado-facial")).toBeUndefined();
  });

  it("getGrupoSlug returns undefined for any codCategoria", () => {
    expect(getGrupoSlug("1")).toBeUndefined();
  });

  it("getGrupoNombre falls back to the raw id (no name resolved)", () => {
    expect(getGrupoNombre("1")).toBe("1");
  });

  it("getProductsByGrupo returns []", () => {
    expect(getProductsByGrupo("1")).toEqual([]);
  });

  it("getCategoriaGrupos returns [] for a real category", () => {
    const realCategoria = getCategoryList()[0]!.nombre;
    expect(getCategoriaGrupos(realCategoria)).toEqual([]);
  });

  it("getCategoryListForGrupos returns [] for any group, and [] for an empty group list", () => {
    expect(getCategoryListForGrupos(["1"])).toEqual([]);
    expect(getCategoryListForGrupos([])).toEqual([]);
  });
});

describe("public/data/products.json (guards RNF-03 / RFC §2.4)", () => {
  const raw: unknown = JSON.parse(
    readFileSync(
      path.join(process.cwd(), "public", "data", "products.json"),
      "utf-8",
    ),
  );

  it("is an array of objects with the RFC §2.4 keys (+ optional offer pricing)", () => {
    expect(Array.isArray(raw)).toBe(true);
    const allowed = new Set<string>(PRODUCT_KEYS);
    for (const row of raw as Record<string, unknown>[]) {
      const keys = new Set(Object.keys(row));
      for (const required of REQUIRED_PRODUCT_KEYS) expect(keys.has(required)).toBe(true);
      for (const key of keys) expect(allowed.has(key)).toBe(true);
    }
  });

  it("precio_regular / descuento_pct only appear together, and only on offers", () => {
    for (const row of raw as Record<string, unknown>[]) {
      const hasRegular = "precio_regular" in row;
      const hasDiscount = "descuento_pct" in row;
      expect(hasRegular).toBe(hasDiscount);
      if (hasRegular) expect(row.en_oferta).toBe(true);
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
