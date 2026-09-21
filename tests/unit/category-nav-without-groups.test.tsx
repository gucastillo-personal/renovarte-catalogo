import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// spec 0015 — the "no groups yet" fallback branch of CategoryNav (ux.md
// "Acceso directo a una categoría específica desde /") can no longer be
// exercised against real data now that renovarte-pipeline has published
// codCategoria for every product (Fase 2, 2026-09-21 — see
// tests/unit/category-nav.test.tsx for the "has groups" branch against real
// data, and tests/unit/category-nav-with-groups.test.tsx for the companion
// fixture that covers the same "has groups" branch deterministically).
// Mocking @/lib/products with an empty group list keeps this
// graceful-degradation path (spec 0015's own Fase-1 promise: "todo lo demás
// sigue exactamente igual que antes" while there's nothing to group) under
// regression, same spirit as the fixture-based tests already in this suite
// — added by tasks.md T19/T20 to replace the real-data coverage this branch
// lost once public/data/products.json stopped being empty of codCategoria.
vi.mock("@/lib/products", () => ({
  getGroupList: () => [],
  getCategoryList: () => [
    { slug: "antiage", nombre: "Antiage", count: 3 },
    { slug: "unas", nombre: "Uñas", count: 1 },
  ],
  getProductsOnOffer: () => [],
}));

const { CategoryNav } = await import("@/components/CategoryNav");

describe("CategoryNav — while getGroupList() is empty (fixture, spec 0015 Fase-1-style fallback)", () => {
  it("falls back to the flat spec-0003 category list — no group chips", () => {
    const html = renderToStaticMarkup(<CategoryNav />);
    expect(html).toContain('href="/categoria/antiage"');
    expect(html).toContain('href="/categoria/unas"');
    expect(html).not.toContain("/grupo/");
  });

  it("highlights the active specific category via activeSlug in the fallback branch", () => {
    const html = renderToStaticMarkup(<CategoryNav activeSlug="unas" />);
    const linkMatch = html.match(/<a[^>]*href="\/categoria\/unas"[^>]*>/);
    expect(linkMatch).not.toBeNull();
    expect(linkMatch![0]).toContain("bg-sage-500");
  });
});
