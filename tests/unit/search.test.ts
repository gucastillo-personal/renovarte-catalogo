import { describe, expect, it } from "vitest";

import { matchProducts, normalizeText } from "@/lib/search";
import type { Product } from "@/lib/types";

function product(over: Partial<Product>): Product {
  return {
    id: "x",
    proveedor: "LACA",
    categoria: "Antiage",
    nombre: "Producto",
    presentacion: "50 g",
    descripcion: "",
    precio_venta: 1000,
    imagen: "/img/placeholder.svg",
    en_oferta: false,
    tags: [],
    ...over,
  };
}

describe("normalizeText", () => {
  it("lowercases, strips accents and trims", () => {
    expect(normalizeText("  Protección SOLAR ")).toBe("proteccion solar");
    expect(normalizeText("Cutánea")).toBe("cutanea");
  });
});

describe("matchProducts", () => {
  const list = [
    product({ id: "1", nombre: "Serum Calmer con Niacinamida" }),
    product({ id: "2", nombre: "Emulsión Aqua Pore", tags: ["rostro", "grasa"] }),
    product({ id: "3", nombre: "Crema Cutánea Reparadora" }),
  ];

  it("returns the whole list for an empty / blank query", () => {
    expect(matchProducts("", list)).toEqual(list);
    expect(matchProducts("   ", list)).toEqual(list);
  });

  it("substring-matches the name, preserving order", () => {
    expect(matchProducts("crema", list).map((p) => p.id)).toEqual(["3"]);
    expect(matchProducts("a", list).map((p) => p.id)).toEqual(["1", "2", "3"]);
  });

  it("is accent- and case-insensitive both ways", () => {
    expect(matchProducts("EMULSION", list).map((p) => p.id)).toEqual(["2"]);
    expect(matchProducts("cutánea", list).map((p) => p.id)).toEqual(["3"]);
    expect(matchProducts("cutanea", list).map((p) => p.id)).toEqual(["3"]);
  });

  it("falls back to a tag match", () => {
    expect(matchProducts("grasa", list).map((p) => p.id)).toEqual(["2"]);
  });

  it("returns [] when nothing matches", () => {
    expect(matchProducts("zzzzz", list)).toEqual([]);
  });
});
