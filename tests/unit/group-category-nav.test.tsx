import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GroupCategoryNav } from "@/components/GroupCategoryNav";

// spec 0015 — nivel 2 (categorías específicas dentro de uno o más grupos).
// Con los datos de hoy (sin codCategoria, sin serlaca_category_groups.json
// todavía) ningún producto pertenece a ningún grupo, así que esto solo puede
// afirmar "no revienta, fila vacía, label con el fallback al id crudo" — T19
// (Fase 2, bloqueada) lo extiende con aserciones de contenido real una vez
// que el pipeline publique ambos archivos.

describe("GroupCategoryNav", () => {
  it("renders nothing when grupos is empty (no group context to nest under)", () => {
    const html = renderToStaticMarkup(<GroupCategoryNav grupos={[]} />);
    expect(html).toBe("");
  });

  it("renders an empty row without throwing, with today's data (single group)", () => {
    const html = renderToStaticMarkup(<GroupCategoryNav grupos={["1"]} />);
    expect(html).not.toContain("/categoria/");
  });

  it("visible eyebrow label falls back to the raw id ('1') when the name isn't resolved yet", () => {
    const html = renderToStaticMarkup(<GroupCategoryNav grupos={["1"]} />);
    expect(html).toContain("Categorías de 1");
    expect(html).toContain('aria-labelledby="group-category-nav-label"');
  });

  it("joins names with '+' for the 2+ grupos case (ux.md 'Multi-grupo' point 4)", () => {
    const html = renderToStaticMarkup(<GroupCategoryNav grupos={["1", "2"]} />);
    // Neither group has a resolved name yet (no serlaca_category_groups.json),
    // so this falls back to the raw ids, joined — same mechanism as a single
    // group, just concatenated.
    expect(html).toContain("Categorías de 1 + 2");
  });
});
