/**
 * CSV source adapter (spec 0002): a local `serlaca_export.csv` -> `CostRow[]`.
 * Kept as the offline fallback for the API source (spec 0009).
 */
import { readFileSync } from "node:fs";

import { parse } from "csv-parse/sync";

import type { CostRow } from "../cost-row";
import { PLACEHOLDER_IMAGE, resolveImagePath } from "../images";

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
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (lastComma !== -1) {
    const decimals = cleaned.length - lastComma - 1;
    normalized =
      cleaned.indexOf(",") === lastComma && decimals !== 3
        ? cleaned.replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (lastDot !== -1) {
    const decimals = cleaned.length - lastDot - 1;
    normalized =
      cleaned.indexOf(".") === lastDot && decimals !== 3
        ? cleaned
        : cleaned.replace(/\./g, "");
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

function requireField(row: CsvRow, key: string): string {
  const value = row[key];
  if (value == null || value.trim() === "") {
    throw new Error(`campo "${key}" vacío`);
  }
  return value.trim();
}

/**
 * Read a serlaca cost CSV into `CostRow[]`. Aborts (throwing, writing nothing)
 * if a required column is missing or any row fails to parse; the error names
 * every bad row by its 1-based line number.
 */
export function readCsvCostRows(
  csvPath: string,
  opts: { publicDir: string },
): { rows: CostRow[]; warnings: string[] } {
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

  const warnings: string[] = [];
  const errors: string[] = [];
  const rows: CostRow[] = [];

  records.forEach((row, index) => {
    const line = index + 2; // header is line 1
    try {
      const codigo = requireField(row, "codigo");
      const imagen = resolveImagePath(codigo, opts.publicDir);
      if (imagen === PLACEHOLDER_IMAGE) {
        warnings.push(`línea ${line} (${codigo}): sin imagen, se usó el placeholder`);
      }
      rows.push({
        codigo,
        nombre: requireField(row, "nombre"),
        categoria: requireField(row, "categoria"),
        presentacion: requireField(row, "presentacion"),
        descripcion: requireField(row, "descripcion"),
        precio_costo: parseARSNumber(requireField(row, "precio_costo")),
        en_oferta: parseBoolean(row.en_oferta),
        tags: parseTags(row.tags),
        imagen,
      });
    } catch (error) {
      errors.push(`línea ${line}: ${(error as Error).message}`);
    }
  });

  if (errors.length > 0) {
    throw new Error(
      `ingesta abortada (${errors.length} error(es)):\n  ${errors.join("\n  ")}`,
    );
  }

  return { rows, warnings };
}
