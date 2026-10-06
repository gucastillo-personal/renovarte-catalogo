import { describe, expect, it } from "vitest";

import { toCartCatalog, toCartCatalogEntry } from "@/lib/cart/catalog-slim";
import type { Product } from "@/lib/types";

const producto: Product = {
  id: "c1",
  proveedor: "LACA",
  categoria: "Cremas",
  nombre: "Crema",
  presentacion: "50 ml",
  descripcion: "Una descripción larga",
  precio_venta: 12000,
  imagen: "/img/c1.svg",
  en_oferta: true,
  tags: ["hidratante"],
  precio_regular: 15000,
  descuento_pct: 20,
  codCategoria: ["1", "2"],
};

describe("catalog-slim (AC-16)", () => {
  it("proyecta exactamente 5 claves, aunque el Product traiga campos extra", () => {
    const entry = toCartCatalogEntry(producto);
    expect(Object.keys(entry).sort()).toEqual(["id", "imagen", "nombre", "precio_venta", "presentacion"]);
    expect(entry).toEqual({
      id: "c1",
      nombre: "Crema",
      presentacion: "50 ml",
      imagen: "/img/c1.svg",
      precio_venta: 12000,
    });
  });

  it("no filtra campos que no existen en el tipo (costo, margen, precio de lista)", () => {
    const sucio = { ...producto, costo: 5000, margen: 0.4, precio_lista: 9000 } as unknown as Product;
    const json = JSON.stringify(toCartCatalogEntry(sucio));
    expect(json).not.toMatch(/costo|margen|precio_lista|descripcion|tags|proveedor/);
  });

  it("indexa por id", () => {
    const cat = toCartCatalog([producto, { ...producto, id: "s1", nombre: "Suero" }]);
    expect(Object.keys(cat).sort()).toEqual(["c1", "s1"]);
    expect(cat.s1?.nombre).toBe("Suero");
  });
});
