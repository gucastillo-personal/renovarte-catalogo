import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AddToCartButtonView } from "@/components/cart/AddToCartButton";
import { NOSCRIPT_FICHA, NOTA_MAXIMO, anuncioAgregado, anuncioYaEnMaximo } from "@/lib/cart/copy";

// spec 0017, F7 — zona de agregar de la ficha (ux.md "Ficha de producto",
// punto 3, y enmienda 2026-10-08 Q-F2c). Vista pura; las interacciones
// (foco, toques, persistencia) se prueban en `tests/e2e/cart.spec.ts`.

function render(props: Partial<Parameters<typeof AddToCartButtonView>[0]> = {}): string {
  return renderToStaticMarkup(
    <AddToCartButtonView mounted={true} cantidad={0} onAdd={() => {}} {...props} />,
  );
}

describe("AddToCartButton — AC-1", () => {
  it('el botón "Agregar al carrito" está en el HTML', () => {
    expect(render()).toMatch(/<button[^>]*>Agregar al carrito<\/button>/);
  });

  it("antes de hidratar está en el HTML pero inerte (tabindex -1, sin eventos de puntero)", () => {
    const html = render({ mounted: false, cantidad: 3 });
    expect(html).toContain("Agregar al carrito");
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("pointer-events-none");
  });

  it("hidratado es alcanzable con teclado", () => {
    const html = render({ mounted: true });
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain("pointer-events-none");
  });

  it("incluye el <noscript> con el aviso y los canales de ux.md", () => {
    const html = render();
    expect(html).toContain("<noscript>");
    expect(html).toContain("Para usar el carrito necesitás JavaScript habilitado.");
    expect(html).toContain("1130579528");
    expect(html).toContain("renovartebyjuli@gmail.com");
    expect(html).toContain("@renovarte_by_juli");
    expect(NOSCRIPT_FICHA).toContain("pedir este producto");
  });

  it("no usa ul > li (el e2e `main ul > li` cuenta cards del catálogo)", () => {
    expect(render({ cantidad: 10 })).not.toMatch(/<(ul|li)[\s>]/);
  });
});

describe("AddToCartButton — línea de estado (ux.md)", () => {
  it("vacía mientras el producto no está en el carrito", () => {
    const html = render({ cantidad: 0 });
    expect(html).not.toContain("En tu carrito");
    expect(html).not.toContain("Ver carrito");
  });

  it('con la línea: "✓ En tu carrito: N · Ver carrito" (link a /carrito)', () => {
    const html = render({ cantidad: 2 });
    expect(html).toContain("✓ En tu carrito: ");
    expect(html).toMatch(/En tu carrito: (<!-- -->)?2/);
    expect(html).toMatch(/<a[^>]*href="\/carrito"[^>]*>Ver carrito<\/a>/);
  });

  it("antes de hidratar no muestra la cantidad (el HTML del servidor no conoce el carrito)", () => {
    expect(render({ mounted: false, cantidad: 2 })).not.toContain("En tu carrito");
  });
});

describe("AddToCartButton — línea en el máximo de 10 (Q-F2c)", () => {
  it("el botón no se deshabilita", () => {
    const html = render({ cantidad: 10 });
    expect(html).not.toMatch(/<button[^>]*disabled/);
    expect(html).not.toContain("aria-disabled");
  });

  it("muestra la nota del máximo con el copy aprobado, y la línea de estado en 10", () => {
    const html = render({ cantidad: 10 });
    expect(NOTA_MAXIMO).toBe(
      "Máximo 10 unidades por producto. Si necesitás más, contalo cuando RenovArte te contacte.",
    );
    expect(html).toContain(NOTA_MAXIMO);
    expect(html).toMatch(/En tu carrito: (<!-- -->)?10/);
  });

  it("con 9 todavía no hay nota", () => {
    expect(render({ cantidad: 9 })).not.toContain("Máximo 10");
  });

  it("los anuncios dicen lo que pasó", () => {
    expect(anuncioAgregado("Crema X", 2)).toBe("Agregaste Crema X al carrito. En tu carrito: 2.");
    expect(anuncioYaEnMaximo("Crema X")).toBe(
      "Crema X ya está en el máximo de 10 unidades. No se agregó otra.",
    );
  });
});
