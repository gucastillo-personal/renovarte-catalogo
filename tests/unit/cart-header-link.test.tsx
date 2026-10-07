import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CartHeaderLinkView, cartLinkLabel } from "@/components/cart/CartHeaderLink";

// spec 0017, F6 — acceso al carrito del header (ux.md "Header" y
// "Accesibilidad"). Se testea la vista pura: el estado del carrito vive en el
// store (`cart-store.test.ts`) y es vacío en el HTML del servidor.

function render(props: Partial<Parameters<typeof CartHeaderLinkView>[0]> = {}): string {
  return renderToStaticMarkup(
    <CartHeaderLinkView count={0} mounted={true} current={false} {...props} />,
  );
}

describe("CartHeaderLink — aria-label dinámico (AC-2)", () => {
  it('vacío: "Carrito, vacío"', () => {
    expect(render({ count: 0 })).toContain('aria-label="Carrito, vacío"');
  });

  it('con productos: "Carrito, N productos"', () => {
    expect(render({ count: 3 })).toContain('aria-label="Carrito, 3 productos"');
  });

  it('con una unidad: "Carrito, 1 producto" (singular)', () => {
    expect(cartLinkLabel(1)).toBe("Carrito, 1 producto");
    expect(render({ count: 1 })).toContain('aria-label="Carrito, 1 producto"');
  });

  it("antes de hidratar es un link real a /carrito, con nombre fijo y sin contador", () => {
    const html = render({ count: 5, mounted: false });
    expect(html).toContain('href="/carrito"');
    expect(html).toContain('aria-label="Carrito"');
    expect(html).not.toContain("tabindex");
    expect(html).not.toContain("tabular-nums");
  });
});

describe("CartHeaderLink — contador visual", () => {
  it("está aria-hidden (el número ya está en el aria-label)", () => {
    const html = render({ count: 3 });
    const m = html.match(/<span[^>]*tabular-nums[^>]*>/);
    expect(m).not.toBeNull();
    expect(m![0]).toContain('aria-hidden="true"');
    expect(m![0]).toContain("absolute");
    expect(html).toMatch(/tabular-nums[^>]*>3</);
  });

  it("no se muestra con 0 productos", () => {
    expect(render({ count: 0 })).not.toContain("tabular-nums");
  });

  it('muestra "99" en 99 y "99+" por encima', () => {
    expect(render({ count: 99 })).toMatch(/tabular-nums[^>]*>99</);
    expect(render({ count: 100 })).toMatch(/tabular-nums[^>]*>99\+</);
    expect(render({ count: 250 })).not.toMatch(/>250</);
  });

  it("la escala de 320 ms solo corre sin prefers-reduced-motion", () => {
    expect(render({ count: 2 })).toContain("motion-safe:animate-[cart-count-pop_320ms");
  });
});

describe("CartHeaderLink — label y estado", () => {
  it('el label "Carrito" aparece recién desde sm (en móvil, solo ícono)', () => {
    const html = render();
    expect(html).toMatch(/<span class="hidden[^"]*sm:inline[^"]*">Carrito<\/span>/);
    expect(html).toContain("<svg");
  });

  it('aria-current="page" solo en /carrito', () => {
    expect(render({ current: true })).toContain('aria-current="page"');
    expect(render({ current: false })).not.toContain("aria-current");
  });

  it("alto mínimo táctil de 44px", () => {
    expect(render()).toContain("min-h-11");
  });
});
