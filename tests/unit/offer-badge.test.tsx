import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OfferBadge } from "@/components/OfferBadge";

describe("OfferBadge", () => {
  it("renders the word 'Oferta' (text, not colour alone)", () => {
    const html = renderToStaticMarkup(<OfferBadge />);
    expect(html).toContain("Oferta");
  });

  it("merges an extra className for positioning", () => {
    const html = renderToStaticMarkup(<OfferBadge className="absolute left-2 top-2" />);
    expect(html).toContain("absolute left-2 top-2");
  });
});
