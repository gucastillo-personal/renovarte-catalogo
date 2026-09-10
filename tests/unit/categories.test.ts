import { describe, expect, it } from "vitest";

import { cleanCategory } from "../../scripts/lib/categories";

describe("cleanCategory", () => {
  it("drops a trailing period", () => {
    expect(cleanCategory("Uñas.")).toBe("Uñas");
    expect(cleanCategory("Labios.")).toBe("Labios");
    expect(cleanCategory("Sombras. ")).toBe("Sombras");
  });

  it("collapses the typo duplicate to one name", () => {
    expect(cleanCategory("Uñas.")).toBe(cleanCategory("Uñas"));
  });

  it("collapses internal whitespace and trims", () => {
    expect(cleanCategory("  Pieles   Grasas  ")).toBe("Pieles Grasas");
  });

  it("applies the rename map (incl. the missing accent)", () => {
    expect(cleanCategory("Proteccion Solar.")).toBe("Protección Solar");
    expect(cleanCategory("Hidratación-Humectación-Tonificación.")).toBe("Hidratación");
    expect(cleanCategory("Dermatocosmética Dr. Enero")).toBe("Dr. Enero");
  });

  it("leaves a clean name untouched", () => {
    expect(cleanCategory("Antiage")).toBe("Antiage");
    expect(cleanCategory("Corporales")).toBe("Corporales");
  });

  it("never returns a name ending in a period", () => {
    for (const raw of ["Uñas.", "Labios.", "Delineadores.", "Proteccion Solar."]) {
      expect(cleanCategory(raw).endsWith(".")).toBe(false);
    }
  });
});
