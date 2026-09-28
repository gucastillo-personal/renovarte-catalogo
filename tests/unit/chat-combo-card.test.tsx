import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChatComboCard } from "@/components/chat/ChatComboCard";
import type { ComboEntry } from "@/lib/chat/types";

// spec 0016, T12 — `ux.md` "Card de combo": 3 budget-relation copy variants
// (never a badge/color of alert), plus the "$0 de diferencia" edge case.

function combo(overrides: Partial<ComboEntry> = {}): ComboEntry {
  return {
    nivel: "mas_barato",
    items: [
      { producto_id: "1", nombre: "Limpiador facial", presentacion: "160 g", precio_venta: 19200 },
      { producto_id: "2", nombre: "Emulsión humectante", presentacion: "100 ml", precio_venta: 14400 },
    ],
    total: 33600,
    ...overrides,
  };
}

describe("ChatComboCard — budget relation copy (AC-8/AC-9)", () => {
  it("por debajo del presupuesto", () => {
    const html = renderToStaticMarkup(<ChatComboCard combo={combo({ total: 33600 })} presupuesto={50000} />);
    expect(html).toContain("por debajo de tu presupuesto");
    expect(html).not.toContain("por encima");
  });

  it("coincide exactamente con el presupuesto ($0 de diferencia)", () => {
    const html = renderToStaticMarkup(<ChatComboCard combo={combo({ total: 50000 })} presupuesto={50000} />);
    expect(html).toContain("Coincide con tu presupuesto");
  });

  it("premium por encima del presupuesto — nunca alarmante, nunca rojo/badge", () => {
    const html = renderToStaticMarkup(
      <ChatComboCard combo={combo({ nivel: "premium", total: 55000 })} presupuesto={50000} />,
    );
    expect(html).toContain("por encima de tu presupuesto");
    expect(html).toContain("es la opción premium");
    expect(html).not.toMatch(/bg-red|text-red|border-red/);
  });

  it("never renders a colored alert class for any variant, and always shows the total with its sr-only prefix", () => {
    for (const total of [30000, 50000, 55000]) {
      const html = renderToStaticMarkup(<ChatComboCard combo={combo({ total })} presupuesto={50000} />);
      expect(html).not.toMatch(/bg-red|text-red|border-red/);
      expect(html).toContain("Total del combo:");
    }
  });

  it("renders each of the 3 nivel labels as visible text, not color alone", () => {
    for (const [nivel, label] of [
      ["mas_barato", "Más barato"],
      ["medio", "Medio"],
      ["premium", "Premium"],
    ] as const) {
      const html = renderToStaticMarkup(<ChatComboCard combo={combo({ nivel })} presupuesto={50000} />);
      expect(html).toContain(label);
    }
  });

  it("links every product to /producto/[id] in a new tab", () => {
    const html = renderToStaticMarkup(<ChatComboCard combo={combo()} presupuesto={50000} />);
    expect(html).toContain('href="/producto/1"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
  });

  it("omits the budget-relation line entirely when presupuesto is unknown", () => {
    const html = renderToStaticMarkup(<ChatComboCard combo={combo()} presupuesto={undefined} />);
    expect(html).not.toContain("Tu presupuesto");
    expect(html).toContain("Total del combo:");
  });
});
