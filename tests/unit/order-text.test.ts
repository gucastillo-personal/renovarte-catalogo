import { describe, expect, it } from "vitest";

import type { CartLine } from "@/lib/cart/model";
import { orderText } from "@/lib/orders/order-text";

// spec 0017, F13 — "Copiar detalle del pedido" (ux.md, AC-28): solo productos y total.

const line = (over: Partial<CartLine>): CartLine => ({
  producto_id: "p1",
  cantidad: 2,
  precio_visto: 32160,
  nombre: "Crema Humectante",
  presentacion: "160 g",
  imagen: "/x.png",
  ...over,
});

describe("orderText", () => {
  it("arma 'Pedido RenovArte', un renglón por producto y el total", () => {
    const t = orderText([line({}), line({ producto_id: "p2", nombre: "Tónico", presentacion: "", cantidad: 1, precio_visto: 1000 })]);
    const rows = t.split("\n");
    expect(rows[0]).toBe("Pedido RenovArte");
    expect(rows[1]).toMatch(/^- Crema Humectante \(160 g\) x2: \$\s64\.320$/);
    expect(rows[2]).toMatch(/^- Tónico x1: \$\s1\.000$/);
    expect(rows[3]).toMatch(/^Total: \$\s65\.320$/);
  });

  it("deja afuera las líneas no disponibles", () => {
    const t = orderText([line({}), line({ producto_id: "p9", nombre: "Viejo", no_disponible: true })]);
    expect(t).not.toContain("Viejo");
    expect(t).toMatch(/Total: \$\s64\.320/);
  });

  it("AC-28: con un nombre y un teléfono canario en el entorno, el texto no los contiene", () => {
    const NOMBRE = "Canario Zzyzx";
    const TEL = "1198765432";
    // La función solo recibe líneas: ni siquiera tiene por dónde recibirlos.
    const t = orderText([line({})]);
    expect(t).not.toContain(NOMBRE);
    expect(t).not.toContain(TEL);
    expect(orderText.length).toBe(1);
  });
});
