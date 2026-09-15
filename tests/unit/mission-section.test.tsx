import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MissionSection } from "@/components/MissionSection";
import { MISSION_SLIDES } from "@/lib/mission-content";

describe("MissionSection", () => {
  const html = renderToStaticMarkup(<MissionSection />);

  it("renders the 5 core messages, no bio/photo of the founder (AC-2)", () => {
    for (const slide of MISSION_SLIDES) {
      expect(html).toContain(slide.text);
    }
    // Only one <img> in the whole section: the closing logo (AC-3), not a
    // stock photo or a founder portrait.
    expect(html.match(/<img/g)?.length).toBe(1);
  });

  it("has a single h1 (the first message) doubling as the section's accessible name", () => {
    const h1Matches = html.match(/<h1[^>]*>/g) ?? [];
    expect(h1Matches).toHaveLength(1);
    expect(html).toContain(MISSION_SLIDES[0]!.text);
  });

  it("closes with exactly one 'RenovArte' logo image (AC-3)", () => {
    const logoMatches = html.match(/<img[^>]*alt="RenovArte"[^>]*>/g) ?? [];
    expect(logoMatches).toHaveLength(1);
  });

  it("has a focusable scroll region that works with no JS (AC-7)", () => {
    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="0"');
  });

  it("has 5 dot anchors and zero arrow controls in the HTML base (AC-7, ux.md 2026-09-14)", () => {
    for (let n = 1; n <= 5; n++) {
      expect(html).toContain(`href="#mensaje-${n}"`);
    }
    expect(html).not.toContain("Mensaje anterior");
    expect(html).not.toContain("Mensaje siguiente");
  });

  it("does not use <ul>/<li> for slides, avoiding collision with the product grid's `main ul > li` e2e selector", () => {
    expect(html).not.toContain("<ul");
    expect(html).not.toContain("<li");
  });

  it("has a 'Ver catálogo' CTA linking to #catalogo (AC-8)", () => {
    expect(html).toContain('href="#catalogo"');
    expect(html).toContain("Ver catálogo");
  });
});
