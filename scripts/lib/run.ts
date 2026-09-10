import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parse } from "csv-parse/sync";

import { validateProducts, type Product } from "@/lib/types";

import { resolveImagePath, PLACEHOLDER_IMAGE } from "./images";
import {
  buildPublicProduct,
  resolveMargin,
  toProductsJson,
  validateColumns,
  type CsvRow,
} from "./transform";

export interface IngestOptions {
  /** Path to the serlaca cost CSV. */
  csvPath: string;
  /** Path to write the public catalog JSON. */
  outPath: string;
  /** Environment holding `MARGIN_PERCENT_*` (never `NEXT_PUBLIC_*`). */
  env: Record<string, string | undefined>;
  /** Public assets root, used to resolve product images. */
  publicDir: string;
}

export interface IngestResult {
  products: Product[];
  warnings: string[];
}

/**
 * Turn the serlaca cost CSV into `public/data/products.json`, applying the
 * configured margin. Pure orchestration around `transform.ts` / `images.ts`.
 *
 * Throws (writing nothing) on: missing required columns, any row-level error, or
 * output that fails the app's own `validateProducts` contract. The internal
 * margin report is spec 0007 and is intentionally not produced here.
 */
export function runIngest(opts: IngestOptions): IngestResult {
  const { csvPath, outPath, env, publicDir } = opts;
  const warnings: string[] = [];

  const text = readFileSync(csvPath, "utf-8");
  const records = parse(text, {
    bom: true,
    columns: (header: string[]) => {
      validateColumns(header);
      return header.map((h) => h.trim());
    },
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  if (records.length === 0) {
    throw new Error(`CSV sin filas de datos: ${csvPath}`);
  }

  // Resolve margins once per category so a bad env var fails fast with one message.
  const categorias = [
    ...new Set(records.map((r) => (r.categoria ?? "").trim()).filter(Boolean)),
  ];
  const marginByCategoria = new Map<string, number>();
  for (const categoria of categorias) {
    marginByCategoria.set(categoria, resolveMargin(categoria, env));
    const key = `MARGIN_PERCENT_${categoria.toUpperCase().replace(/\s+/g, "_")}`;
    if (env[key] === undefined) {
      warnings.push(
        `categoría "${categoria}": sin ${key}, se usó MARGIN_PERCENT_DEFAULT ` +
          `(${marginByCategoria.get(categoria)}%)`,
      );
    }
  }

  const errors: string[] = [];
  const products: Product[] = [];

  records.forEach((row, index) => {
    const line = index + 2; // header is line 1
    try {
      const codigo = (row.codigo ?? "").trim();
      const categoria = (row.categoria ?? "").trim();
      if (!categoria) throw new Error(`campo "categoria" vacío`);
      const margin = marginByCategoria.get(categoria);
      if (margin === undefined) throw new Error(`categoría desconocida: ${categoria}`);

      const imagen = resolveImagePath(codigo || "_", publicDir);
      if (imagen === PLACEHOLDER_IMAGE) {
        warnings.push(`línea ${line} (${codigo || "sin código"}): sin imagen, se usó el placeholder`);
      }

      products.push(buildPublicProduct(row, { margin, imagen }));
    } catch (error) {
      errors.push(`línea ${line}: ${(error as Error).message}`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`ingesta abortada (${errors.length} error(es)):\n  ${errors.join("\n  ")}`);
  }

  // Final gate: the output must satisfy the exact contract the app consumes.
  const validated = validateProducts(products);

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, toProductsJson(validated));

  return { products: validated, warnings };
}
