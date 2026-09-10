import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { validateProducts, type Product } from "@/lib/types";

import { cleanCategory } from "./categories";
import type { CostRow } from "./cost-row";
import { buildPublicProduct, resolveMargin, toProductsJson } from "./pricing";
import { readCsvCostRows } from "./sources/csv";

export interface BuildCatalogResult {
  products: Product[];
  warnings: string[];
}

/**
 * Transform stage core (spec 0009): normalised `CostRow[]` ->
 * `public/data/products.json`, applying category cleanup and the configured
 * margin per category. Source-agnostic (CSV or serlaca API raw dump).
 *
 * Throws (writing nothing) on a bad margin env var, any row-level error, or
 * output that fails the app's own `validateProducts` contract. The internal
 * margin report is spec 0007 and is not produced here.
 */
export function buildCatalog(
  rows: CostRow[],
  opts: { env: Record<string, string | undefined>; outPath: string },
): BuildCatalogResult {
  const { env, outPath } = opts;
  if (rows.length === 0) {
    throw new Error("transform abortado: no hay productos para procesar");
  }

  // Normalise category names before anything groups by them (spec 0009 AC-5).
  const normalised = rows.map((row) => ({
    ...row,
    categoria: cleanCategory(row.categoria),
  }));

  const warnings: string[] = [];

  // Resolve margins once per category so a bad env var fails fast with one message.
  const categorias = [
    ...new Set(normalised.map((r) => r.categoria.trim()).filter(Boolean)),
  ];
  const marginByCategoria = new Map<string, number>();
  const usedDefault: string[] = [];
  for (const categoria of categorias) {
    marginByCategoria.set(categoria, resolveMargin(categoria, env));
    const key = `MARGIN_PERCENT_${categoria.toUpperCase().replace(/\s+/g, "_")}`;
    if (env[key] === undefined) usedDefault.push(categoria);
  }
  if (usedDefault.length > 0) {
    const pct = env.MARGIN_PERCENT_DEFAULT ?? "20";
    warnings.push(
      `${usedDefault.length} categoría(s) sin MARGIN_PERCENT_* propio → ` +
        `MARGIN_PERCENT_DEFAULT (${pct}%): ${usedDefault.join(", ")}`,
    );
  }

  const errors: string[] = [];
  const products: Product[] = [];

  normalised.forEach((row, index) => {
    try {
      const categoria = row.categoria.trim();
      if (!categoria) throw new Error(`campo "categoria" vacío`);
      if (!row.codigo.trim()) throw new Error(`campo "codigo" vacío`);
      const margin = marginByCategoria.get(categoria);
      if (margin === undefined) throw new Error(`categoría desconocida: ${categoria}`);

      products.push(buildPublicProduct(row, { margin }));
    } catch (error) {
      errors.push(`item ${index + 1}: ${(error as Error).message}`);
    }
  });

  if (errors.length > 0) {
    throw new Error(
      `transform abortado (${errors.length} error(es)):\n  ${errors.join("\n  ")}`,
    );
  }

  // Final gate: the output must satisfy the exact contract the app consumes.
  const validated = validateProducts(products);

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, toProductsJson(validated));

  return { products: validated, warnings };
}

export interface BuildFromCsvOptions {
  csvPath: string;
  outPath: string;
  env: Record<string, string | undefined>;
  /** Public assets root, used to resolve local product images. */
  publicDir: string;
}

/** CSV-source convenience wrapper (spec 0002 fallback). */
export function buildCatalogFromCsv(opts: BuildFromCsvOptions): BuildCatalogResult {
  const { rows, warnings } = readCsvCostRows(opts.csvPath, { publicDir: opts.publicDir });
  const result = buildCatalog(rows, { env: opts.env, outPath: opts.outPath });
  return { products: result.products, warnings: [...warnings, ...result.warnings] };
}
