import { describe, expect, it } from "vitest";

import { isProduct, validateGroupNames, validateProducts, type Product } from "@/lib/types";

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

describe("isProduct — offer pricing (spec 0007)", () => {
  const onOffer: Product = {
    ...valid,
    en_oferta: true,
    precio_venta: 900,
    precio_regular: 1000,
    descuento_pct: 10,
  };

  it("accepts well-formed offer pricing", () => {
    expect(isProduct(onOffer)).toBe(true);
  });

  it("accepts a product with neither field (no offer / flag-only offer)", () => {
    expect(isProduct(valid)).toBe(true);
  });

  it("rejects descuento_pct without precio_regular and vice versa", () => {
    const { precio_regular, ...withoutRegular } = onOffer;
    void precio_regular;
    expect(isProduct(withoutRegular)).toBe(false);

    const { descuento_pct, ...withoutDiscount } = onOffer;
    void descuento_pct;
    expect(isProduct(withoutDiscount)).toBe(false);
  });

  it("rejects precio_regular <= precio_venta", () => {
    expect(isProduct({ ...onOffer, precio_regular: 900 })).toBe(false);
    expect(isProduct({ ...onOffer, precio_regular: 800 })).toBe(false);
  });

  it("rejects descuento_pct out of 1..99 or non-integer", () => {
    expect(isProduct({ ...onOffer, descuento_pct: 0 })).toBe(false);
    expect(isProduct({ ...onOffer, descuento_pct: 100 })).toBe(false);
    expect(isProduct({ ...onOffer, descuento_pct: 10.5 })).toBe(false);
  });
});

describe("isProduct — codCategoria (spec 0015, array schema per renovarte-pipeline spec 0001)", () => {
  it("accepts a product with no codCategoria (today's data)", () => {
    expect(isProduct(valid)).toBe(true);
  });

  it("accepts an empty codCategoria array", () => {
    expect(isProduct({ ...valid, codCategoria: [] })).toBe(true);
  });

  it("accepts an array with an unrecognized id (AC-6 — not rejected at the parse boundary)", () => {
    expect(isProduct({ ...valid, codCategoria: ["9"] })).toBe(true);
  });

  it("accepts an array with a recognized id", () => {
    expect(isProduct({ ...valid, codCategoria: ["1"] })).toBe(true);
  });

  it("accepts an array with more than one recognized id (multi-grupo)", () => {
    expect(isProduct({ ...valid, codCategoria: ["1", "2"] })).toBe(true);
  });

  it("rejects a non-array codCategoria (e.g. the old single-string shape)", () => {
    expect(isProduct({ ...valid, codCategoria: "1" })).toBe(false);
  });

  it("rejects an array containing a non-string element", () => {
    expect(isProduct({ ...valid, codCategoria: [1] })).toBe(false);
  });
});

describe("validateGroupNames (spec 0015)", () => {
  const allFour = { "1": "Cuidado facial", "2": "Cuidado corporal", "3": "Cosmética", "4": "Otros" };

  it("accepts an object with the 4 valid keys", () => {
    expect(validateGroupNames(allFour)).toEqual(allFour);
  });

  it("discards an unrecognized key without throwing", () => {
    expect(validateGroupNames({ ...allFour, "5": "Inventado" })).toEqual(allFour);
  });

  it("discards an empty-string value without throwing (that key is absent from the result)", () => {
    expect(validateGroupNames({ ...allFour, "4": "" })).toEqual({
      "1": "Cuidado facial",
      "2": "Cuidado corporal",
      "3": "Cosmética",
    });
  });

  it("discards a non-string value without throwing", () => {
    expect(validateGroupNames({ ...allFour, "4": 4 })).toEqual({
      "1": "Cuidado facial",
      "2": "Cuidado corporal",
      "3": "Cosmética",
    });
  });

  it("throws when raw is not a plain object (e.g. an array)", () => {
    expect(() => validateGroupNames(["Cuidado facial"])).toThrow(/must be an object/);
  });

  it("throws when raw is null", () => {
    expect(() => validateGroupNames(null)).toThrow(/must be an object/);
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
