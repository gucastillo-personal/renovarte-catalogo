import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuantityStepper } from "@/components/cart/QuantityStepper";

// spec 0017, F9 — stepper (ux.md "Líneas del carrito" y "Accesibilidad").

function render(cantidad: number): string {
  return renderToStaticMarkup(
    <QuantityStepper
      productoId="p1"
      nombre="Crema X"
      cantidad={cantidad}
      onMinus={() => {}}
      onPlus={() => {}}
    />,
  );
}

// El atributo, no las clases `disabled:*`.
const DISABLED = /\sdisabled=""/;

function button(html: string, label: string): string {
  const m = html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`));
  expect(m).not.toBeNull();
  return m![0];
}

describe("QuantityStepper", () => {
  it('es un role="group" con nombre "Cantidad de {nombre}"', () => {
    expect(render(2)).toContain('role="group" aria-label="Cantidad de Crema X"');
  });

  it("botones con nombre accesible, 44x40 y la cantidad en <output>", () => {
    const html = render(2);
    expect(button(html, "Restar una unidad")).toContain("h-10 w-11");
    expect(button(html, "Sumar una unidad")).toContain("h-10 w-11");
    expect(html).toMatch(/<output[^>]*>2<\/output>/);
  });

  it("el <output> no es una segunda live region", () => {
    expect(render(2)).toMatch(/<output[^>]*aria-live="off"/);
  });

  it('"−" se deshabilita en 1 y "+" no', () => {
    const html = render(1);
    expect(button(html, "Restar una unidad")).toMatch(DISABLED);
    expect(button(html, "Sumar una unidad")).not.toMatch(DISABLED);
  });

  it('"+" se deshabilita en el máximo (10) y "−" no', () => {
    const html = render(10);
    expect(button(html, "Sumar una unidad")).toMatch(DISABLED);
    expect(button(html, "Restar una unidad")).not.toMatch(DISABLED);
  });

  it("en el medio, ninguno está deshabilitado", () => {
    const html = render(5);
    expect(button(html, "Restar una unidad")).not.toMatch(DISABLED);
    expect(button(html, "Sumar una unidad")).not.toMatch(DISABLED);
  });
});
