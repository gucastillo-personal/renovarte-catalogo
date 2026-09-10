/**
 * Public product schema.
 *
 * Mirrors RFC-0001 §2.4 exactly. These are the ONLY keys allowed in
 * `public/data/products.json` and the only product data that reaches the
 * browser. Real cost, applied margin and LACA list price never appear here
 * (see specs/constitution.md §I).
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
  /** Final sale price, precomputed by the ingest script. Integer ARS. */
  precio_venta: number;
  /** Public path under /public, e.g. "/img/laca/545300004.svg". */
  imagen: string;
  en_oferta: boolean;
  tags: string[];
}

/** Keys that must be present on every product. Used by the runtime guard and tests. */
export const PRODUCT_KEYS = [
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Runtime guard for a single product coming from untyped JSON. Checks that every
 * expected key is present with the right primitive type and that `tags` is an
 * array of strings. Used at the JSON parse boundary in `products.ts`.
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
