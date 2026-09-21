import { isCodCategoria, type CodCategoria } from "@/lib/category-groups";

/**
 * Public product schema.
 *
 * Mirrors RFC-0001 §2.4 (amended by spec 0007 with two optional offer-pricing
 * fields, and by spec 0015 with the optional `codCategoria` group id list).
 * These are the only keys allowed in `public/data/products.json` and
 * the only product data that reaches the browser. Real cost, applied margin and
 * LACA list price never appear here (see specs/constitution.md §I).
 */
export interface Product {
  /** serlaca product code, e.g. "545300004". Used as the detail route param. */
  id: string;
  /** Supplier. Only "LACA" in Phase 1; field exists for multi-provider (RFC §2.4). */
  proveedor: string;
  categoria: string;
  nombre: string;
  presentacion: string;
  descripcion: string;
  /** Final sale price (already discounted if on offer), precomputed by the ingest script. Integer ARS. */
  precio_venta: number;
  /** Public path under /public, e.g. "/img/laca/545300004.svg". */
  imagen: string;
  en_oferta: boolean;
  tags: string[];
  /**
   * Price before the offer discount. Present only when `en_oferta` and the
   * offer carries a `descuento_pct > 0` (spec 0007). Always > `precio_venta`.
   */
  precio_regular?: number;
  /** Discount percentage, 1..99. Present iff `precio_regular` is (spec 0007). */
  descuento_pct?: number;
  /**
   * Raw high-level group ids from Serlaca (each "1"-"4"), published by
   * renovarte-pipeline (spec 0001-agrupacion-alto-nivel-categorias). An
   * **array** — a product can belong to more than one group at once
   * (confirmed against the real Serlaca API, spec 0015 `ux.md`
   * "Multi-grupo"; the pipeline's own schema requires it non-empty with a
   * `["4"]` fallback, but this side stays lax). Optional and untyped as a
   * plain string array (not `CodCategoria[]`) at the parse boundary: an
   * absent array, an empty one, or unrecognized entries must not fail
   * validation or hide the product from "Todos" (spec 0015 AC-6) — they're
   * resolved defensively to "no group" downstream, in
   * src/lib/products.ts's `codCategoriasOf`.
   */
  codCategoria?: string[];
}

/** Keys that must be present on every product. */
export const REQUIRED_PRODUCT_KEYS = [
  "id",
  "proveedor",
  "categoria",
  "nombre",
  "presentacion",
  "descripcion",
  "precio_venta",
  "imagen",
  "en_oferta",
  "tags",
] as const satisfies ReadonlyArray<keyof Product>;

/**
 * Keys present only on a subset of products (offer pricing — spec 0007;
 * high-level group id — spec 0015).
 */
export const OPTIONAL_PRODUCT_KEYS = [
  "precio_regular",
  "descuento_pct",
  "codCategoria",
] as const satisfies ReadonlyArray<keyof Product>;

/** Every key a product may carry. Used by tests as the allow-list (superset). */
export const PRODUCT_KEYS = [
  ...REQUIRED_PRODUCT_KEYS,
  ...OPTIONAL_PRODUCT_KEYS,
] as const satisfies ReadonlyArray<keyof Product>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Runtime guard for a single product coming from untyped JSON. Checks that
 * every required key is present with the right primitive type, that `tags` is
 * an array of strings, and — when present — that the offer-pricing fields
 * (spec 0007) are well-typed and mutually consistent. Used at the JSON parse
 * boundary in `products.ts`.
 */
export function isProduct(value: unknown): value is Product {
  if (!isRecord(value)) return false;

  const stringKeys: Array<keyof Product> = [
    "id",
    "proveedor",
    "categoria",
    "nombre",
    "presentacion",
    "descripcion",
    "imagen",
  ];
  for (const key of stringKeys) {
    if (typeof value[key] !== "string") return false;
  }

  if (typeof value.precio_venta !== "number" || !Number.isFinite(value.precio_venta)) {
    return false;
  }
  if (typeof value.en_oferta !== "boolean") return false;
  if (!Array.isArray(value.tags) || !value.tags.every((t) => typeof t === "string")) {
    return false;
  }

  const { precio_regular, descuento_pct } = value;
  const hasRegular = precio_regular !== undefined;
  const hasDiscount = descuento_pct !== undefined;
  if (hasRegular !== hasDiscount) return false; // must appear together
  if (hasRegular && hasDiscount) {
    if (typeof precio_regular !== "number" || !Number.isFinite(precio_regular)) return false;
    if (typeof descuento_pct !== "number" || !Number.isInteger(descuento_pct)) return false;
    if (descuento_pct < 1 || descuento_pct > 99) return false;
    if (precio_regular <= value.precio_venta) return false;
  }

  // codCategoria (spec 0015): optional array, laxly typed at the parse
  // boundary — an empty array or an id not in CATEGORY_GROUP_IDS is
  // accepted (AC-6: unrecognized/empty must not fail validation, only
  // resolve to "no group" downstream in products.ts). Only the shape
  // (array of strings) is enforced here.
  if (value.codCategoria !== undefined) {
    if (
      !Array.isArray(value.codCategoria) ||
      !value.codCategoria.every((c) => typeof c === "string")
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Parse a raw JSON value into a typed Product list. Throws with a precise
 * message if the value is not an array or any row fails the guard, so a bad
 * data file fails the build instead of shipping broken pages.
 */
export function validateProducts(raw: unknown): Product[] {
  if (!Array.isArray(raw)) {
    throw new Error(`products data must be an array, got ${typeof raw}`);
  }
  return raw.map((row, index) => {
    if (!isProduct(row)) {
      throw new Error(
        `products data: row ${index} is not a valid Product: ${JSON.stringify(row)}`,
      );
    }
    return row;
  });
}

/**
 * Parse `public/data/serlaca_category_groups.json` (spec 0015) — the
 * `codCategoria` -> business name map, published by `renovarte-pipeline`.
 * Throws only if `raw` isn't a plain object at all (real file corruption,
 * same criterion as `validateProducts` with the array shape). An
 * individual key/value pair that's malformed (unrecognized key, empty
 * string value) is dropped silently instead of failing the whole file, so
 * one bad entry (e.g. group "4") doesn't take down the other 3.
 */
export function validateGroupNames(raw: unknown): Partial<Record<CodCategoria, string>> {
  if (!isRecord(raw)) {
    throw new Error(`category groups data must be an object, got ${typeof raw}`);
  }

  const result: Partial<Record<CodCategoria, string>> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isCodCategoria(key)) continue;
    if (typeof value !== "string" || value.length === 0) continue;
    result[key] = value;
  }
  return result;
}
