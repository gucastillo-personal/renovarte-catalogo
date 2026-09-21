import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CategoryNav } from "@/components/CategoryNav";
import { getCategoryList, getGroupList, getProductsOnOffer } from "@/lib/products";

// spec 0012 — chips de categoría alineados a docs/brand.md.

describe("CategoryNav", () => {
  it("renders inactive category chips with the brand.md token pair (sage-100/sage-700) — AC-1", () => {
    // With today's data getGroupList() is [] (spec 0015, Fase 1, no
    // codCategoria published yet), so CategoryNav falls back to spec
    // 0003's flat category list (ux.md "Acceso directo a una categoría
    // específica desde /") — this still exercises that real render path.
    const html = renderToStaticMarkup(<CategoryNav />);
    const categories = getCategoryList();
    // "Todos" is active by default (no activeSlug); pick a real category, which
    // is never active in this render, and assert on its own anchor markup.
    const firstCategory = categories[0];
    if (!firstCategory) throw new Error("fixture has no categories");
    const linkMatch = html.match(
      new RegExp(`<a[^>]*href="/categoria/${firstCategory.slug}"[^>]*>`),
    );
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

  it("falls back to the flat spec-0003 category list — never just Todos/Ofertas — while getGroupList() is empty (spec 0015, Fase 1; ux.md 'Acceso directo a una categoría específica desde /')", () => {
    // Today's public/data/products.json has no codCategoria yet, so
    // getGroupList() is []. Per the corrected ux.md design, this does NOT
    // strip category access down to nothing — it degrades to exactly the
    // spec 0003 behavior (flat category chips, one click from /), so the
    // 2 preexisting spec-0003 e2e suites (tests/e2e/catalog.spec.ts:88,
    // :98) keep passing unmodified. Only once real groups exist (Fase 2)
    // does nivel 1 switch to group chips — see
    // tests/unit/category-nav-with-groups.test.tsx for that branch,
    // covered with an in-memory fixture since it can't be exercised
    // against today's real data.
    expect(getGroupList()).toEqual([]);
    const html = renderToStaticMarkup(<CategoryNav activeGrupoSlug="cuidado-facial" />);
    expect(html).toContain("/categoria/");
    expect(html).not.toContain("/grupo/");
  });
});
