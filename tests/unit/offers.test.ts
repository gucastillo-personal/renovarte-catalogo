import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadOffers } from "../../scripts/lib/offers";

const tmpDirs: string[] = [];
afterEach(() => {
  while (tmpDirs.length) rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});
function writeJson(content: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "offers-"));
  tmpDirs.push(dir);
  const file = path.join(dir, "offers.json");
  writeFileSync(file, content);
  return file;
}

describe("loadOffers", () => {
  it("reads { codigos: [...] } as flag-only (descuentoPct 0)", () => {
    const map = loadOffers(writeJson('{ "codigos": ["A", " B ", ""] }'));
    expect([...map.entries()]).toEqual([
      ["A", { descuentoPct: 0 }],
      ["B", { descuentoPct: 0 }],
    ]);
  });

  it("reads a bare array", () => {
    expect(loadOffers(writeJson('["A"]')).get("A")).toEqual({ descuentoPct: 0 });
  });

  it("reads per-code discounts", () => {
    const map = loadOffers(
      writeJson('{ "codigos": { "A": {}, "B": { "descuento_pct": 10 } } }'),
    );
    expect(map.get("A")).toEqual({ descuentoPct: 0 });
    expect(map.get("B")).toEqual({ descuentoPct: 10 });
  });

  it("reads a bare object", () => {
    expect(loadOffers(writeJson('{ "A": { "descuento_pct": 25 } }')).get("A")).toEqual({
      descuentoPct: 25,
    });
  });

  it("returns an empty map when the file does not exist", () => {
    expect(loadOffers(path.join(tmpdir(), "nope-offers-xyz.json")).size).toBe(0);
  });

  it("throws on invalid JSON", () => {
    expect(() => loadOffers(writeJson("{ not json"))).toThrow(/JSON inválido/);
  });

  it("throws on an out-of-range discount", () => {
    expect(() =>
      loadOffers(writeJson('{ "codigos": { "A": { "descuento_pct": 150 } } }')),
    ).toThrow(/descuento_pct inválido/);
  });
});
