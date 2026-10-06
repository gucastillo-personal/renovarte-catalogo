import { describe, expect, it } from "vitest";

import type { CartCatalog } from "@/lib/cart/catalog-slim";
import type { CartLine } from "@/lib/cart/model";
import { applyRechazoCatalogo, revalidateCart } from "@/lib/cart/revalidate";

const catalogo: CartCatalog = {
  c1: { id: "c1", nombre: "Crema", presentacion: "50 ml", imagen: "/img/c1.svg", precio_venta: 13000 },
  s1: { id: "s1", nombre: "Suero", presentacion: "30 ml", imagen: "/img/s1.svg", precio_venta: 8000 },
};

const linea = (over: Partial<CartLine>): CartLine => ({
  producto_id: "c1",
  cantidad: 2,
  precio_visto: 12000,
  nombre: "Crema",
  presentacion: "50 ml",
  imagen: "/img/c1.svg",
  ...over,
});

describe("revalidateCart (AC-15)", () => {
  it("un precio cambiado se actualiza al vigente y deja la nota antes/ahora", () => {
    const r = revalidateCart([linea({})], catalogo);
    expect(r.lines[0]?.precio_visto).toBe(13000);
    expect(r.lines[0]?.cantidad).toBe(2);
    expect(r.notas).toEqual([{ producto_id: "c1", antes: 12000, ahora: 13000 }]);
    expect(r.noDisponibles).toEqual([]);
  });

  it("un precio igual no genera nota", () => {
    const r = revalidateCart([linea({ producto_id: "s1", precio_visto: 8000, nombre: "Suero" })], catalogo);
    expect(r.notas).toEqual([]);
  });

  it("un id inexistente queda no disponible y conserva su snapshot", () => {
    const vieja = linea({ producto_id: "zz", nombre: "Descontinuado", precio_visto: 500 });
    const r = revalidateCart([vieja], catalogo);
    expect(r.lines[0]).toEqual({ ...vieja, no_disponible: true });
    expect(r.noDisponibles).toEqual(["zz"]);
    expect(r.notas).toEqual([]);
  });

  it("una línea que había quedado no disponible y volvió al catálogo se rehabilita", () => {
    const r = revalidateCart([linea({ no_disponible: true })], catalogo);
    expect(r.lines[0]?.no_disponible).toBeUndefined();
    expect(r.noDisponibles).toEqual([]);
  });

  it("no muta la entrada", () => {
    const entrada = [linea({})];
    revalidateCart(entrada, catalogo);
    expect(entrada[0]?.precio_visto).toBe(12000);
  });
});

describe("applyRechazoCatalogo (AC-15)", () => {
  it("aplica el precio vigente y las no disponibles del 409", () => {
    const lines = [linea({}), linea({ producto_id: "s1", nombre: "Suero", precio_visto: 8000 }), linea({ producto_id: "g1", nombre: "Gel" })];
    const r = applyRechazoCatalogo(lines, {
      v: 1,
      resultado: "rechazada_por_catalogo",
      lineas: [
        { producto_id: "c1", estado: "precio_cambiado", precio_vigente: 13500 },
        { producto_id: "g1", estado: "no_disponible" },
      ],
      total_vigente: 40000,
    });
    expect(r.lines[0]?.precio_visto).toBe(13500);
    expect(r.lines[1]?.precio_visto).toBe(8000);
    expect(r.lines[2]?.no_disponible).toBe(true);
    expect(r.notas).toEqual([{ producto_id: "c1", antes: 12000, ahora: 13500 }]);
    expect(r.noDisponibles).toEqual(["g1"]);
  });

  it("ignora ids del rechazo que no están en el carrito", () => {
    const lines = [linea({})];
    const r = applyRechazoCatalogo(lines, {
      v: 1,
      resultado: "rechazada_por_catalogo",
      lineas: [{ producto_id: "otro", estado: "no_disponible" }],
      total_vigente: 0,
    });
    expect(r.lines).toEqual(lines);
    expect(r.notas).toEqual([]);
  });
});
