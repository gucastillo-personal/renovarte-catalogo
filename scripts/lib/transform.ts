/**
 * Pure helpers for the ingest pipeline (spec 0002). No filesystem, no env
 * mutation — every input is a plain value so each function is unit-testable in
 * isolation. Orchestration lives in `run.ts`.
 */
import type { Product } from "@/lib/types";

export type CsvRow = Record<string, string | undefined>;

export const REQUIRED_COLUMNS = [
  "codigo",
  "nombre",
  "categoria",
  "presentacion",
  "descripcion",
  "precio_costo",
] as const;

export const OPTIONAL_COLUMNS = ["en_oferta", "tags"] as const;

/** Throw naming every missing required column, so a changed serlaca export fails loud (PRD §8). */
export function validateColumns(headers: string[]): void {
  const present = new Set(headers.map((h) => h.trim()));
  const missing = REQUIRED_COLUMNS.filter((c) => !present.has(c));
  if (missing.length > 0) {
    throw new Error(
      `CSV: faltan columnas requeridas: ${missing.join(", ")}. ` +
        `Columnas encontradas: ${headers.join(", ")}`,
    );
  }
}

/**
 * Parse a number that may arrive in Argentine format: "28000", "28.000",
 * "28000,50", "$ 28.000,50". Throws if there is no parseable number.
 */
export function parseARSNumber(raw: string): number {
  const cleaned = raw.replace(/[^0-9.,-]/g, "");
  if (cleaned === "" || cleaned === "-") {
    throw new Error(`valor numérico inválido: ${JSON.stringify(raw)}`);
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;

  if (lastComma !== -1 && lastDot !== -1) {
    // Both separators present: the rightmost one is the decimal separator.
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (lastComma !== -1) {
    const decimals = cleaned.length - lastComma - 1;
    normalized =
      cleaned.indexOf(",") === lastComma && decimals !== 3
        ? cleaned.replace(",", ".") // "28000,50" -> decimal
        : cleaned.replace(/,/g, ""); // "28,000" / "1,234,567" -> thousands
  } else if (lastDot !== -1) {
    const decimals = cleaned.length - lastDot - 1;
    normalized =
      cleaned.indexOf(".") === lastDot && decimals !== 3
        ? cleaned // "28.50" -> decimal
        : cleaned.replace(/\./g, ""); // "28.000" / "1.234.567" -> thousands
  } else {
    normalized = cleaned;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    throw new Error(`valor numérico inválido: ${JSON.stringify(raw)}`);
  }
  return n;
}

const TRUTHY = new Set(["si", "sí", "true", "1", "x", "yes"]);

/** Absent / empty / "no" / "false" / "0" -> false. */
export function parseBoolean(raw: string | undefined): boolean {
  return TRUTHY.has((raw ?? "").trim().toLowerCase());
}

/** Split on "|" or "," , trim, drop empties. Absent -> []. */
export function parseTags(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[|,]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

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

function requireField(row: CsvRow, key: string): string {
  const value = row[key];
  if (value == null || value.trim() === "") {
    throw new Error(`campo "${key}" vacío`);
  }
  return value.trim();
}

/**
 * Build one public product from a CSV row. The returned object has exactly the
 * keys of the public schema (RFC §2.4) in schema order — cost and margin are
 * consumed here and never stored (constitution §I).
 */
export function buildPublicProduct(
  row: CsvRow,
  opts: { margin: number; imagen: string },
): Product {
  const costo = parseARSNumber(requireField(row, "precio_costo"));
  return {
    id: requireField(row, "codigo"),
    proveedor: "LACA",
    categoria: requireField(row, "categoria"),
    nombre: requireField(row, "nombre"),
    presentacion: requireField(row, "presentacion"),
    descripcion: requireField(row, "descripcion"),
    precio_venta: computeSalePrice(costo, opts.margin),
    imagen: opts.imagen,
    en_oferta: parseBoolean(row.en_oferta),
    tags: parseTags(row.tags),
  };
}

/** Deterministic JSON for `public/data/products.json`: sorted by id, trailing newline. */
export function toProductsJson(products: Product[]): string {
  const sorted = [...products].sort((a, b) => a.id.localeCompare(b.id, "en"));
  return `${JSON.stringify(sorted, null, 2)}\n`;
}
