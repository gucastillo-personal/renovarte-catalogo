import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { slugifyCategoria } from "@/lib/category-slug";

describe("slugifyCategoria", () => {
  it.each([
    ["Antiage", "antiage"],
    ["Protección Solar", "proteccion-solar"],
    ["Hidratación", "hidratacion"],
    ["Dr. Enero", "dr-enero"],
    ["Uñas", "unas"],
    ["Correctores e Iluminadores", "correctores-e-iluminadores"],
    ["Pinceles y Paletas", "pinceles-y-paletas"],
    ["LACA Beauty", "laca-beauty"],
  ])("%j -> %j", (input, expected) => {
    expect(slugifyCategoria(input)).toBe(expected);
  });

  it("has no leading/trailing/double dashes", () => {
    const s = slugifyCategoria("  ...Foo //  Bar!!  ");
    expect(s).toBe("foo-bar");
  });

  it("is idempotent on its own output", () => {
    for (const c of ["Protección Solar", "Dr. Enero", "Uñas"]) {
      expect(slugifyCategoria(slugifyCategoria(c))).toBe(slugifyCategoria(c));
    }
  });
});

describe("real catalog categories", () => {
  const products = JSON.parse(
    readFileSync(path.join(process.cwd(), "public", "data", "products.json"), "utf-8"),
  ) as { categoria: string }[];
  const categories = [...new Set(products.map((p) => p.categoria))];

  it("every category produces a unique, non-empty slug", () => {
    const slugs = categories.map((c) => slugifyCategoria(c));
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(new Set(slugs).size).toBe(categories.length);
  });
});
