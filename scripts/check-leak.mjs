#!/usr/bin/env node
/*
 * Fails if business-sensitive tokens (cost, margin, LACA list price) appear in
 * anything that ships to the browser or is committed as public data.
 * Enforces PRD RNF-03 / specs/constitution.md §I. Run after `pnpm build`.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = [".next", path.join("public", "data")];
const SKIP_DIRS = new Set(["cache"]); // .next/cache: build cache, never served
const TEXT_EXT = new Set([
  ".js", ".mjs", ".cjs", ".json", ".html", ".css", ".map", ".txt", ".rsc",
]);

const FORBIDDEN = [
  /precio_costo/i,
  /precio_publico_laca/i,
  /precio_lista_laca/i,
  /margin_percent/i,
  /\bmargen\b/i,
  /(?<![\p{L}])costo(?![\p{L}])/iu,
];

/** @param {string} dir */
function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      yield path.join(dir, entry.name);
    }
  }
}

const hits = [];
for (const rel of SCAN_DIRS) {
  const abs = path.join(ROOT, rel);
  if (!existsSync(abs)) continue;
  const files = statSync(abs).isDirectory() ? [...walk(abs)] : [abs];
  for (const file of files) {
    if (!TEXT_EXT.has(path.extname(file))) continue;
    let content;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    for (const pattern of FORBIDDEN) {
      const match = content.match(pattern);
      if (match) {
        hits.push({ file: path.relative(ROOT, file), token: match[0] });
        break;
      }
    }
  }
}

if (hits.length > 0) {
  console.error("check:leak FAILED — sensitive tokens found in shipped output:\n");
  for (const { file, token } of hits) {
    console.error(`  ${file}  ->  "${token}"`);
  }
  console.error(
    "\nCost / margin / LACA list price must never reach a public artifact (RNF-03).",
  );
  process.exit(1);
}

console.log("check:leak OK — no sensitive tokens in .next/ or public/data/.");
