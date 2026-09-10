/**
 * Shared, source-agnostic core of the ingest pipeline. Every input is a plain
 * value so each function is unit-testable in isolation. Source adapters live in
 * `sources/`; orchestration in `run.ts`.
 */
import type { Product } from "@/lib/types";

import type { CostRow } from "./cost-row";

/**
 * Margin percentage for a category: `MARGIN_PERCENT_<CATEGORY>` (upper-cased,
 * spaces -> "_"), else `MARGIN_PERCENT_DEFAULT`, else 20 (RFC §2.3 / §2.6).
 * Throws if the resolved value is not a finite number >= 0.
 */
export function resolveMargin(
  categoria: string,
  env: Record<string, string | undefined>,
): number {
  const key = `MARGIN_PERCENT_${categoria.toUpperCase().replace(/\s+/g, "_")}`;
  const source = env[key] ?? env.MARGIN_PERCENT_DEFAULT ?? "20";
  const n = Number(source);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(
      `margen inválido para "${categoria}": ${key}=${env[key] ?? "(no seteado)"}, ` +
        `MARGIN_PERCENT_DEFAULT=${env.MARGIN_PERCENT_DEFAULT ?? "(no seteado)"}`,
    );
  }
  return n;
}

/** precio_venta = round(costo * (1 + margen/100)) — RFC §2.3. */
export function computeSalePrice(costo: number, marginPercent: number): number {
  return Math.round(costo * (1 + marginPercent / 100));
}

/**
 * Build one public product from a normalised `CostRow`. The returned object has
 * exactly the keys of the public schema (RFC §2.4) in schema order — the cost
 * (`precio_costo`) and the margin are consumed here and never stored
 * (constitution §I).
 */
export function buildPublicProduct(row: CostRow, opts: { margin: number }): Product {
  return {
    id: row.codigo,
    proveedor: "LACA",
    categoria: row.categoria,
    nombre: row.nombre,
    presentacion: row.presentacion,
    descripcion: row.descripcion,
    precio_venta: computeSalePrice(row.precio_costo, opts.margin),
    imagen: row.imagen,
    en_oferta: row.en_oferta,
    tags: row.tags,
  };
}

/** Deterministic JSON for `public/data/products.json`: sorted by id, trailing newline. */
export function toProductsJson(products: Product[]): string {
  const sorted = [...products].sort((a, b) => a.id.localeCompare(b.id, "en"));
  return `${JSON.stringify(sorted, null, 2)}\n`;
}
