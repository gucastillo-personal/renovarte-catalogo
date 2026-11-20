import { describe, expect, it } from "vitest";

import { anuncioCombo, resultadoCombo } from "@/lib/cart/copy";

// spec 0017, F17 — ux.md "Card de combo" > "Combo con alguna línea ya en el máximo de 10" (Q-F2c).

describe("resultadoCombo", () => {
  it("k = N: confirmación estándar", () => {
    expect(resultadoCombo(2, 2, 5)).toBe(
      "Agregaste los 2 productos de este combo, 1 de cada uno. Tu carrito tiene 5 productos.",
    );
  });

  it("0 < k < N: dice cuántos sumaron y cuántos ya estaban en el máximo (singular)", () => {
    expect(resultadoCombo(2, 3, 12)).toBe(
      "Agregaste 2 de los 3 productos de este combo, 1 de cada uno. 1 ya estaba en el máximo de 10 unidades por producto. Tu carrito tiene 12 productos.",
    );
  });

  it("0 < k < N con M > 1: plural", () => {
    expect(resultadoCombo(1, 3, 21)).toContain("2 ya estaban en el máximo de 10 unidades por producto");
  });

  it("k = 0: no agregamos nada, sin '✓' y sin la nota de contactar a RenovArte", () => {
    const t = resultadoCombo(0, 2, 20);
    expect(t).toBe(
      "No agregamos nada: los 2 productos de este combo ya están en el máximo de 10 unidades por producto. Tu carrito tiene 20 productos.",
    );
    expect(t).not.toContain("✓");
    expect(t).not.toContain("contacte");
  });

  it("singular de 'producto' en el total del carrito", () => {
    expect(resultadoCombo(1, 1, 1)).toBe(
      "Agregaste el producto de este combo, 1 de cada uno. Tu carrito tiene 1 producto.",
    );
  });
});

describe("anuncioCombo", () => {
  it("lleva el prefijo 'Combo {nivel}:' y no el '✓'", () => {
    const t = anuncioCombo("Más barato", 2, 2, 2);
    expect(t).toBe(
      "Combo Más barato: agregaste los 2 productos de este combo, 1 de cada uno. Tu carrito tiene 2 productos.",
    );
    expect(t).not.toContain("✓");
  });

  it("k = 0 conserva el texto con minúscula inicial", () => {
    expect(anuncioCombo("Premium", 0, 2, 20)).toMatch(/^Combo Premium: no agregamos nada:/);
  });
});
