import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CategoryNav } from "@/components/CategoryNav";
import { getGroupList, getProductsOnOffer } from "@/lib/products";

// spec 0012 — chips de categoría alineados a docs/brand.md.

describe("CategoryNav", () => {
  it("renders inactive group chips with the brand.md token pair (sage-100/sage-700) — AC-1", () => {
    // With real data getGroupList() is non-empty (spec 0015, Fase 2 —
    // renovarte-pipeline published codCategoria + serlaca_category_groups.json,
    // 2026-09-21), so nivel 1 renders one chip per group instead of the
    // spec-0003 flat category list (ux.md "Acceso directo a una categoría
    // específica desde /") — this exercises that real render path. The
    // empty-list fallback branch is covered separately, with a fixture, in
    // tests/unit/category-nav-without-groups.test.tsx (it can no longer be
    // exercised against real data now that every product has a
    // codCategoria).
    const html = renderToStaticMarkup(<CategoryNav />);
    const groups = getGroupList();
    // "Todos" is active by default (no activeSlug); pick a real group, which
    // is never active in this render, and assert on its own anchor markup.
    const firstGroup = groups[0];
    if (!firstGroup) throw new Error("no real groups in public/data/products.json");
    const linkMatch = html.match(new RegExp(`<a[^>]*href="/grupo/${firstGroup.slug}"[^>]*>`));
    expect(linkMatch).not.toBeNull();
    const anchorHtml = linkMatch![0];
    expect(anchorHtml).toContain("bg-sage-100");
    expect(anchorHtml).toContain("text-sage-700");
  });

  it("renders the active chip ('Todos', active by default) with bg-sage-500 — AC-2", () => {
    const html = renderToStaticMarkup(<CategoryNav />);
    const linkMatch = html.match(/<a[^>]*href="\/"[^>]*>/);
    expect(linkMatch).not.toBeNull();
    const anchorHtml = linkMatch![0];
    expect(anchorHtml).toContain("bg-sage-500");
  });

  it.skipIf(getProductsOnOffer().length === 0)(
    "keeps the 'Ofertas' chip on bg-sage-100/text-sage-800 when inactive (no regression) — AC-4",
    () => {
      const html = renderToStaticMarkup(<CategoryNav />);
      const linkMatch = html.match(/<a[^>]*href="\/ofertas"[^>]*>/);
      expect(linkMatch).not.toBeNull();
      const anchorHtml = linkMatch![0];
      expect(anchorHtml).toContain("bg-sage-100");
      expect(anchorHtml).toContain("text-sage-800");
      expect(anchorHtml).not.toContain("bg-sage-500");
    },
  );

  it("computes WCAG contrast for the active chip pair sage-500/beige-50 (AA for UI, >=3:1) — AC-3", () => {
    // Hex literals taken from src/app/globals.css (spec 0006 tokens). This is a
    // design-value check on string literals in a test file, not a component —
    // no-stray-hex.test.ts only scans src/components and src/app.
    const SAGE_500 = "#7a9463";
    const BEIGE_50 = "#faf8f2";

    function relativeLuminance(hex: string): number {
      const channel = (i: number) => {
        const linear = parseInt(hex.slice(i, i + 2), 16) / 255;
        return linear <= 0.03928 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4;
      };
      const [r, g, b] = [channel(1), channel(3), channel(5)];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function contrastRatio(hexA: string, hexB: string): number {
      const lumA = relativeLuminance(hexA);
      const lumB = relativeLuminance(hexB);
      const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
      return (lighter + 0.05) / (darker + 0.05);
    }

    const ratio = contrastRatio(SAGE_500, BEIGE_50);
    // Calculated value: ~3.17:1 (plan.md estimated ~3.2:1). Passes the 3:1
    // threshold WCAG 1.4.11 sets for
    // UI components / large text — the vara docs/brand.md literally invokes
    // ("pasa AA para UI") for this same token pair, per plan.md AC-3. It does
    // NOT clear the stricter 4.5:1 threshold for normal-size body text; see
    // plan.md "Riesgos" #1 — reported to CTO/CEO with the exact number, not
    // resolved unilaterally by darkening the color.
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it("switches to group chips — no flat category list — now that real groups exist (spec 0015 AC-1, Fase 2; ux.md 'Acceso directo a una categoría específica desde /')", () => {
    // renovarte-pipeline published codCategoria + serlaca_category_groups.json
    // (2026-09-21) — getGroupList() is non-empty now, so nivel 1 shows one
    // chip per group and specific categories move to nivel 2
    // (GroupCategoryNav), per AC-1 ("no ve una lista plana que mezcla
    // categorías de todos los grupos"). tasks.md T20(b) updates the 2
    // spec-0003 e2e suites (tests/e2e/catalog.spec.ts:88, :98) accordingly,
    // now that the "sin modificar" exception from T17 (which depended on
    // getGroupList() being empty) no longer holds.
    expect(getGroupList().length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(
      <CategoryNav activeGrupoSlug={getGroupList()[0]!.slug} />,
    );
    expect(html).toContain("/grupo/");
    expect(html).not.toContain("/categoria/");
  });
});
