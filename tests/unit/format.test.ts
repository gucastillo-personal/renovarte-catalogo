import { describe, expect, it } from "vitest";

import { formatARS } from "@/lib/format";

describe("formatARS", () => {
  it("formats an integer as ARS with no decimals", () => {
    const out = formatARS(35280);
    expect(out).toMatch(/35\.280/);
    expect(out).not.toMatch(/[.,]\d{2}$/);
  });

  it("handles zero", () => {
    expect(formatARS(0)).toMatch(/0/);
  });
});
