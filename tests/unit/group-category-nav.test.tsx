import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GroupCategoryNav } from "@/components/GroupCategoryNav";
import { getCategoriaGrupos, getCategoryList, getGroupList, getGrupoNombre } from "@/lib/products";

// spec 0015 — nivel 2 (categorías específicas dentro de uno o más grupos),
// contra datos reales (Fase 2 — renovarte-pipeline publicó codCategoria +
// serlaca_category_groups.json, 2026-09-21, tasks.md T19). No hardcodea
// nombres/conteos exactos: los toma de getGroupList()/getCategoryList()
// para no romper con el próximo refresh de datos del pipeline.

describe("GroupCategoryNav", () => {
  it("renders nothing when grupos is empty (no group context to nest under)", () => {
    const html = renderToStaticMarkup(<GroupCategoryNav grupos={[]} />);
    expect(html).toBe("");
  });

  it("renders a real, non-empty row of category chips for a single real group, with its resolved name in the eyebrow label", () => {
    const group = getGroupList()[0]!;
    const html = renderToStaticMarkup(<GroupCategoryNav grupos={[group.codCategoria]} />);
    expect(html).toContain("/categoria/");
    expect(html).toContain(`Categorías de ${group.nombre}`);
    expect(html).toContain('aria-labelledby="group-category-nav-label"');
  });

  it("marks the active categoria's chip with aria-current", () => {
    const group = getGroupList()[0]!;
    const category = getCategoryList().find((c) =>
      getCategoriaGrupos(c.nombre).includes(group.codCategoria),
    );
    expect(category).toBeDefined();

    const html = renderToStaticMarkup(
      <GroupCategoryNav grupos={[group.codCategoria]} activeCategoriaSlug={category!.slug} />,
    );
    const linkMatch = html.match(
      new RegExp(`<a[^>]*href="/categoria/${category!.slug}"[^>]*>`),
    );
    expect(linkMatch).not.toBeNull();
    expect(linkMatch![0]).toContain('aria-current="page"');
  });

  it("real multi-group case: joins resolved names with '+' and shows the union of categories (ux.md 'Multi-grupo' punto 4)", () => {
    const multi = getCategoryList().find((c) => getCategoriaGrupos(c.nombre).length >= 2);
    expect(multi).toBeDefined();

    const grupos = getCategoriaGrupos(multi!.nombre);
    const html = renderToStaticMarkup(
      <GroupCategoryNav grupos={grupos} activeCategoriaSlug={multi!.slug} />,
    );

    const expectedLabel = grupos.map((g) => getGrupoNombre(g)).join(" + ");
    expect(html).toContain(`Categorías de ${expectedLabel}`);
    expect(html).toContain(`href="/categoria/${multi!.slug}"`);
  });
});
