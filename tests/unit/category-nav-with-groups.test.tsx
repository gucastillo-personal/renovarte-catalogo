import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// spec 0015 — the "real groups exist" branch of CategoryNav can't be
// exercised against today's public/data/products.json (no codCategoria
// published yet, Fase 2 pending — see ux.md "Acceso directo a una
// categoría específica desde /"). Mocking @/lib/products with an in-memory
// fixture lets this repo prove the AC-1 behavior (nivel 1 switches to
// group chips, drops the flat category list) ahead of Fase 2, same spirit
// as the fixture-based tests in tests/unit/products.test.ts.
vi.mock("@/lib/products", () => ({
  getGroupList: () => [
    { codCategoria: "1", slug: "cuidado-facial", nombre: "Cuidado facial", count: 3 },
    { codCategoria: "3", slug: "cosmetica", nombre: "Cosmética", count: 1 },
  ],
  getCategoryList: () => [
    { slug: "antiage", nombre: "Antiage", count: 3 },
    { slug: "unas", nombre: "Uñas", count: 1 },
  ],
  getProductsOnOffer: () => [],
}));

const { CategoryNav } = await import("@/components/CategoryNav");

describe("CategoryNav — once real groups exist (fixture, simulates Fase 2)", () => {
  it("shows one chip per group, in nivel 1", () => {
    const html = renderToStaticMarkup(<CategoryNav />);
    expect(html).toContain('href="/grupo/cuidado-facial"');
    expect(html).toContain('href="/grupo/cosmetica"');
  });

  it("no longer shows the flat specific-category list (AC-1: no plain list mixing every category)", () => {
    const html = renderToStaticMarkup(<CategoryNav />);
    expect(html).not.toContain("/categoria/");
  });

  it("highlights the active group chip via activeGrupoSlug", () => {
    const html = renderToStaticMarkup(<CategoryNav activeGrupoSlug="cosmetica" />);
    const linkMatch = html.match(/<a[^>]*href="\/grupo\/cosmetica"[^>]*>/);
    expect(linkMatch).not.toBeNull();
    expect(linkMatch![0]).toContain("bg-sage-500");
  });
});
