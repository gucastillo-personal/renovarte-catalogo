import { describe, expect, it } from "vitest";

import { CATEGORY_GROUP_IDS, isCodCategoria } from "@/lib/category-groups";

describe("CATEGORY_GROUP_IDS", () => {
  it("has exactly 4 elements in the fixed business order", () => {
    expect(CATEGORY_GROUP_IDS).toEqual(["1", "2", "3", "4"]);
  });
});

describe("isCodCategoria", () => {
  it("accepts every known id", () => {
    for (const id of CATEGORY_GROUP_IDS) {
      expect(isCodCategoria(id)).toBe(true);
    }
  });

  it("rejects unknown ids", () => {
    expect(isCodCategoria("0")).toBe(false);
    expect(isCodCategoria("5")).toBe(false);
    expect(isCodCategoria("")).toBe(false);
    expect(isCodCategoria("cuidado-facial")).toBe(false);
  });
});
