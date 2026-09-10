import { describe, expect, it } from "vitest";

import { isProduct, validateProducts, type Product } from "@/lib/types";

const valid: Product = {
  id: "1",
  proveedor: "LACA",
  categoria: "Antiage",
  nombre: "Crema X",
  presentacion: "50 g",
  descripcion: "desc",
  precio_venta: 1000,
  imagen: "/img/laca/1.svg",
  en_oferta: false,
  tags: ["día"],
};

describe("isProduct", () => {
  it("accepts a well-formed product", () => {
    expect(isProduct(valid)).toBe(true);
  });

  it("rejects a missing string field", () => {
    const { nombre, ...rest } = valid;
    void nombre;
    expect(isProduct(rest)).toBe(false);
  });

  it("rejects a non-numeric precio_venta", () => {
    expect(isProduct({ ...valid, precio_venta: "1000" })).toBe(false);
  });

  it("rejects a non-boolean en_oferta", () => {
    expect(isProduct({ ...valid, en_oferta: "no" })).toBe(false);
  });

  it("rejects tags that are not an array of strings", () => {
    expect(isProduct({ ...valid, tags: [1, 2] })).toBe(false);
    expect(isProduct({ ...valid, tags: "día" })).toBe(false);
  });

  it("rejects null / non-object / array", () => {
    expect(isProduct(null)).toBe(false);
    expect(isProduct("x")).toBe(false);
    expect(isProduct([valid])).toBe(false);
  });
});

describe("validateProducts", () => {
  it("returns the typed list for valid input", () => {
    expect(validateProducts([valid])).toEqual([valid]);
  });

  it("throws when the value is not an array", () => {
    expect(() => validateProducts({})).toThrow(/must be an array/);
  });

  it("throws and names the bad row index", () => {
    expect(() => validateProducts([valid, { ...valid, precio_venta: null }])).toThrow(
      /row 1 is not a valid Product/,
    );
  });
});
