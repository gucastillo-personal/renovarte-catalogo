import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CartLineItem } from "@/components/cart/CartLineItem";
import type { CartLine } from "@/lib/cart/model";
import { formatARS } from "@/lib/format";

// spec 0017, F8/F9 — línea del carrito (ux.md "Página /carrito", ítem 3, y
// enmienda 2026-10-08 Q-F2d).

const LINE: CartLine = {
  producto_id: "p1",
  cantidad: 2,
  precio_visto: 32160,
  nombre: "Crema Humectante Con Aceite De Palta X 160g",
  presentacion: "160 g",
  imagen: "/img/laca/p1.svg",
};

function render(
  line: Partial<CartLine> = {},
  nota?: { producto_id: string; antes: number; ahora: number },
): string {
  return renderToStaticMarkup(
    <ul>
      <CartLineItem
        line={{ ...LINE, ...line }}
        nota={nota}
        onMinus={() => {}}
        onPlus={() => {}}
        onRemove={() => {}}
      />
    </ul>,
  );
}

describe("CartLineItem — línea disponible", () => {
  it("nombre como link a la ficha, presentación, precio c/u y subtotal", () => {
    const html = render();
    expect(html).toContain('href="/producto/p1"');
    expect(html).toContain(LINE.nombre);
    expect(html).toContain("160 g · ");
    expect(html).toContain(`${formatARS(32160)} c/u`);
    expect(html).toContain("Subtotal: ");
    expect(html).toContain(formatARS(32160 * 2));
  });

  it("la miniatura es decorativa (alt vacío)", () => {
    expect(render()).toMatch(/<img[^>]*alt=""/);
  });

  it("sin presentación se omite junto con su separador", () => {
    const html = render({ presentacion: "" });
    expect(html).not.toContain(" · ");
    expect(html).toContain(`${formatARS(32160)} c/u`);
  });

  it('"Quitar" lleva el nombre del producto en sr-only', () => {
    expect(render()).toMatch(
      /Quitar<span class="sr-only"> Crema Humectante Con Aceite De Palta X 160g<\/span>/,
    );
  });

  it("tiene el stepper", () => {
    expect(render()).toContain('aria-label="Cantidad de Crema Humectante');
  });

  it("nota del precio cambiado", () => {
    const html = render({}, { producto_id: "p1", antes: 13900, ahora: 14400 });
    expect(html).toContain(`El precio cambió: antes ${formatARS(13900)}, ahora ${formatARS(14400)}.`);
  });

  it("sin nota si el precio no cambió", () => {
    expect(render()).not.toContain("El precio cambió");
  });
});

describe("CartLineItem — nota del máximo (Q-F2d)", () => {
  it("aparece cuando la cantidad es 10, en una fila propia bajo el stepper", () => {
    const html = render({ cantidad: 10 });
    expect(html).toContain(
      "Máximo 10 unidades por producto. Si necesitás más, contalo cuando RenovArte te contacte.",
    );
    expect(html).toMatch(/<p class="text-sm text-sage-700">Máximo 10/);
    expect(html.indexOf("Máximo 10")).toBeGreaterThan(html.indexOf("Cantidad de"));
  });

  it("no aparece con 9", () => {
    expect(render({ cantidad: 9 })).not.toContain("Máximo 10");
  });

  it("no es una live region", () => {
    const html = render({ cantidad: 10 });
    expect(html).not.toContain('aria-live="polite"');
    expect(html).not.toContain('role="status"');
  });

  it("va después de la nota de precio cambiado", () => {
    const html = render({ cantidad: 10 }, { producto_id: "p1", antes: 1, ahora: 2 });
    expect(html.indexOf("El precio cambió")).toBeLessThan(html.indexOf("Máximo 10"));
  });
});

describe("CartLineItem — ya no está en el catálogo (AC-15)", () => {
  const html = render({ no_disponible: true });

  it('muestra "Ya no está en el catálogo" y "No se incluye en la orden"', () => {
    expect(html).toContain("Ya no está en el catálogo");
    expect(html).toContain("No se incluye en la orden");
  });

  it("no tiene precio, subtotal, stepper ni link a la ficha", () => {
    expect(html).not.toContain("c/u");
    expect(html).not.toContain("Subtotal");
    expect(html).not.toContain('role="group"');
    expect(html).not.toContain("/producto/");
  });

  it('solo conserva "Quitar", con miniatura al 50%', () => {
    expect(html).toContain("Quitar");
    expect(html).toContain("opacity-50");
  });
});
