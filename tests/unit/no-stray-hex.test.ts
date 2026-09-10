import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// AC-2 (spec 0006): components style with sage/beige tokens, never raw hex.
// Allowed: globals.css (the token source) and metadata values that must be hex
// literals (viewport.themeColor, manifest colors).
const ROOTS = ["src/components", "src/app"];
const ALLOW = new Set([
  path.join("src", "app", "layout.tsx"), // viewport.themeColor
  path.join("src", "app", "manifest.ts"), // theme_color / background_color
]);
const HEX = /#[0-9a-fA-F]{3,8}\b/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("no stray hex colours in components (spec 0006 AC-2)", () => {
  it("every .tsx/.ts styles with tokens, not hard-coded hex", () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const file of walk(root)) {
        if (file.endsWith("globals.css") || ALLOW.has(file)) continue;
        const lines = readFileSync(file, "utf-8").split("\n");
        lines.forEach((line, i) => {
          if (HEX.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim()}`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
