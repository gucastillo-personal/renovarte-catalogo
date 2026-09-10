import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { validateProducts, type Product } from "@/lib/types";

import { cleanCategory } from "./categories";
import type { CostRow } from "./cost-row";
import type { Offer } from "./offers";
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
export interface BuildCatalogOptions {
  env: Record<string, string | undefined>;
  outPath: string;
  /** Manual offers by product code (spec 0005, from data/offers.json). */
  offers?: Map<string, Offer>;
}

export function buildCatalog(
  rows: CostRow[],
  opts: BuildCatalogOptions,
): BuildCatalogResult {
  const { env, outPath, offers } = opts;
  if (rows.length === 0) {
    throw new Error("transform abortado: no hay productos para procesar");
  }

  // Normalise category names (spec 0009 AC-5) and flag manual offers
  // (spec 0005) before anything groups or builds.
  const normalised = rows.map((row) => ({
    ...row,
    categoria: cleanCategory(row.categoria),
    en_oferta: offers?.has(row.codigo.trim()) ? true : row.en_oferta,
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

      const product = buildPublicProduct(row, { margin });
      const descuentoPct = offers?.get(row.codigo.trim())?.descuentoPct ?? 0;
      if (descuentoPct > 0) {
        product.precio_venta = Math.round(
          product.precio_venta * (1 - descuentoPct / 100),
        );
      }
      products.push(product);
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
  offers?: Map<string, Offer>;
}

/** CSV-source convenience wrapper (spec 0002 fallback). */
export function buildCatalogFromCsv(opts: BuildFromCsvOptions): BuildCatalogResult {
  const { rows, warnings } = readCsvCostRows(opts.csvPath, { publicDir: opts.publicDir });
  const result = buildCatalog(rows, {
    env: opts.env,
    outPath: opts.outPath,
    offers: opts.offers,
  });
  return { products: result.products, warnings: [...warnings, ...result.warnings] };
}
