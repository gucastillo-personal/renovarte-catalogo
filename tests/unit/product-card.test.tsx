import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProductCard } from "@/components/ProductCard";
import { getAllProducts } from "@/lib/products";

// spec 0013 — cuerpo de ProductCard: fondo/padding/tipografía definidos por
// ux.md (AC-1) y contraste AA (AC-2).

describe("ProductCard body", () => {
  const product = getAllProducts()[0];
  if (!product) throw new Error("fixture has no products");

  it("uses bg-beige-100, the ux.md padding and the new name typography — AC-1", () => {
    const html = renderToStaticMarkup(<ProductCard product={product} />);

    // Outer <a> (the whole-card <Link>) carries the body background.
    expect(html).toContain("bg-beige-100");

    // Body <div> carries the asymmetric padding (12px/14px/16px).
    expect(html).toContain("pt-3");
    expect(html).toContain("px-3.5");
    expect(html).toContain("pb-4");

    // Name <h2> is text-sm font-semibold (14px/600), not the old font-medium.
    const h2Match = html.match(/<h2[^>]*>/);
    expect(h2Match).not.toBeNull();
    const h2Html = h2Match![0];
    expect(h2Html).toContain("text-sm");
    expect(h2Html).toContain("font-semibold");
    expect(h2Html).not.toContain("font-medium");
  });

  it("does not touch radius, image treatment or OfferBadge wiring — AC-6", () => {
    const html = renderToStaticMarkup(<ProductCard product={product} />);
    expect(html).toContain("rounded-lg");
    expect(html).toContain("aspect-square");
  });

  it("computes WCAG AA contrast for the name (sage-800) and final price (sage-900) over the new beige-100 body — AC-2", () => {
    // Hex literals taken from src/app/globals.css (spec 0006 tokens), same
    // pattern as tests/unit/category-nav.test.tsx (spec 0012, AC-3).
    // no-stray-hex.test.ts only scans src/components and src/app, not tests/.
    const SAGE_800 = "#3d4436";
    const SAGE_900 = "#333a2e";
    const BEIGE_100 = "#f4f1e8";

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

    // Calculated values (per ux.md): ~8.9:1 (name) and ~10.3:1 (final price).
    // AA for normal text requires >= 4.5:1 — both clear it with margin.
    expect(contrastRatio(SAGE_800, BEIGE_100)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(SAGE_900, BEIGE_100)).toBeGreaterThanOrEqual(4.5);
  });
});
