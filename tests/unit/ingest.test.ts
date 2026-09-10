import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { PRODUCT_KEYS, validateProducts, type Product } from "@/lib/types";

import { runIngest } from "../../scripts/lib/run";
import {
  buildPublicProduct,
  computeSalePrice,
  parseARSNumber,
  parseBoolean,
  parseTags,
  resolveMargin,
  toProductsJson,
  validateColumns,
  type CsvRow,
} from "../../scripts/lib/transform";

const SAMPLE_CSV = path.join(process.cwd(), "data", "raw", "serlaca_export.sample.csv");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const FULL_HEADER =
  "codigo,nombre,categoria,presentacion,descripcion,precio_costo,en_oferta,tags";

const tmpDirs: string[] = [];
function makeTmpDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ingest-"));
  tmpDirs.push(dir);
  return dir;
}
afterEach(() => {
  while (tmpDirs.length) rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// pure helpers
// ---------------------------------------------------------------------------

describe("validateColumns", () => {
  it("accepts a header with every required column", () => {
    expect(() => validateColumns(FULL_HEADER.split(","))).not.toThrow();
  });

  it("throws naming each missing required column", () => {
    expect(() =>
      validateColumns(["codigo", "nombre", "categoria", "presentacion", "en_oferta"]),
    ).toThrow(/faltan columnas requeridas:.*descripcion.*precio_costo|precio_costo.*descripcion/);
  });
});

describe("parseARSNumber", () => {
  it.each([
    ["28000", 28000],
    ["28.000", 28000],
    ["28000,50", 28000.5],
    ["$ 28.000,50", 28000.5],
    ["  1234  ", 1234],
    ["29,90", 29.9],
    ["1.234.567", 1234567],
  ])("parses %j -> %d", (input, expected) => {
    expect(parseARSNumber(input)).toBe(expected);
  });

  it.each(["abc", "", "  ", "-"])("throws on %j", (input) => {
    expect(() => parseARSNumber(input)).toThrow(/numérico inválido/);
  });
});

describe("parseBoolean", () => {
  it.each(["si", "sí", "SÍ", "true", "1", "x", "yes"])("%j -> true", (raw) => {
    expect(parseBoolean(raw)).toBe(true);
  });
  it.each(["", "no", "false", "0", "  ", undefined])("%j -> false", (raw) => {
    expect(parseBoolean(raw)).toBe(false);
  });
});

describe("parseTags", () => {
  it("splits on | and , , trims, drops empties", () => {
    expect(parseTags("día|noche | antiage")).toEqual(["día", "noche", "antiage"]);
    expect(parseTags("a, b ,, c")).toEqual(["a", "b", "c"]);
  });
  it("returns [] for empty / undefined", () => {
    expect(parseTags("")).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
  });
});

describe("resolveMargin", () => {
  it("falls back to 20 when nothing is set", () => {
    expect(resolveMargin("Antiage", {})).toBe(20);
  });
  it("uses MARGIN_PERCENT_DEFAULT", () => {
    expect(resolveMargin("Antiage", { MARGIN_PERCENT_DEFAULT: "25" })).toBe(25);
  });
  it("prefers a per-category override (spaces -> _ , upper-cased)", () => {
    expect(
      resolveMargin("Antiage", {
        MARGIN_PERCENT_DEFAULT: "25",
        MARGIN_PERCENT_ANTIAGE: "30",
      }),
    ).toBe(30);
    expect(
      resolveMargin("Protección Solar", { MARGIN_PERCENT_PROTECCIÓN_SOLAR: "12" }),
    ).toBe(12);
  });
  it.each(["abc", "-5"])("throws on invalid value %j", (bad) => {
    expect(() => resolveMargin("Antiage", { MARGIN_PERCENT_DEFAULT: bad })).toThrow(
      /margen inválido/,
    );
  });
});

describe("computeSalePrice", () => {
  it.each([
    [29400, 20, 35280],
    [16500, 20, 19800],
    [100, 33, 133],
    [101, 33, 134],
  ])("round(%d * (1 + %d/100)) = %d", (costo, margin, expected) => {
    expect(computeSalePrice(costo, margin)).toBe(expected);
  });
});

describe("buildPublicProduct", () => {
  const row: CsvRow = {
    codigo: " 900 ",
    nombre: " Serum ",
    categoria: "Antiage",
    presentacion: "30 ml",
    descripcion: "desc",
    precio_costo: "10.000",
    en_oferta: "si",
    tags: "a|b",
  };

  it("emits exactly the public schema keys, in schema order, no cost/margin", () => {
    const product = buildPublicProduct(row, { margin: 20, imagen: "/img/placeholder.svg" });
    expect(Object.keys(product)).toEqual([...PRODUCT_KEYS]);
    expect(product).not.toHaveProperty("costo");
    expect(product).not.toHaveProperty("precio_costo");
    expect(product).not.toHaveProperty("margen");
  });

  it("computes precio_venta from cost + margin and trims fields", () => {
    const product = buildPublicProduct(row, { margin: 20, imagen: "/x.svg" });
    expect(product.precio_venta).toBe(12000);
    expect(product.id).toBe("900");
    expect(product.nombre).toBe("Serum");
    expect(product.proveedor).toBe("LACA");
    expect(product.en_oferta).toBe(true);
    expect(product.tags).toEqual(["a", "b"]);
  });

  it("throws when a required field is empty", () => {
    expect(() =>
      buildPublicProduct({ ...row, precio_costo: "" }, { margin: 20, imagen: "/x" }),
    ).toThrow(/campo "precio_costo" vacío/);
  });
});

describe("toProductsJson", () => {
  const p = (id: string): Product => ({
    id,
    proveedor: "LACA",
    categoria: "Antiage",
    nombre: `n${id}`,
    presentacion: "50 g",
    descripcion: "d",
    precio_venta: 1,
    imagen: "/i.svg",
    en_oferta: false,
    tags: [],
  });

  it("sorts by id and ends with a single trailing newline", () => {
    const json = toProductsJson([p("30"), p("10"), p("20")]);
    expect(json.endsWith("]\n")).toBe(true);
    expect((JSON.parse(json) as Product[]).map((x) => x.id)).toEqual(["10", "20", "30"]);
  });
});

// ---------------------------------------------------------------------------
// orchestrator
// ---------------------------------------------------------------------------

describe("runIngest", () => {
  function ingestSample(env: Record<string, string | undefined>) {
    const outPath = path.join(makeTmpDir(), "products.json");
    const result = runIngest({ csvPath: SAMPLE_CSV, outPath, env, publicDir: PUBLIC_DIR });
    return { outPath, result };
  }

  it("writes a catalog that passes the app's own validation (AC-1)", () => {
    const { outPath, result } = ingestSample({ MARGIN_PERCENT_DEFAULT: "20" });
    expect(result.products).toHaveLength(3);
    const written: unknown = JSON.parse(readFileSync(outPath, "utf-8"));
    expect(() => validateProducts(written)).not.toThrow();
  });

  it("is idempotent — byte-identical output on a second run (AC-3)", () => {
    const env = { MARGIN_PERCENT_DEFAULT: "20" };
    const outPath = path.join(makeTmpDir(), "products.json");
    runIngest({ csvPath: SAMPLE_CSV, outPath, env, publicDir: PUBLIC_DIR });
    const first = readFileSync(outPath, "utf-8");
    runIngest({ csvPath: SAMPLE_CSV, outPath, env, publicDir: PUBLIC_DIR });
    expect(readFileSync(outPath, "utf-8")).toBe(first);
  });

  it("applies MARGIN_PERCENT_DEFAULT to every product (AC-2)", () => {
    const { result } = ingestSample({ MARGIN_PERCENT_DEFAULT: "35" });
    const byId = Object.fromEntries(result.products.map((p) => [p.id, p.precio_venta]));
    expect(byId).toEqual({
      "545300004": 39690, // 29400 * 1.35
      "512100031": 32535, // 24100 * 1.35
      "530700018": 22275, // 16500 * 1.35
    });
  });

  it("lets a per-category override win for that category only (AC-2)", () => {
    const { result } = ingestSample({
      MARGIN_PERCENT_DEFAULT: "20",
      MARGIN_PERCENT_ANTIAGE: "10",
    });
    const byId = Object.fromEntries(result.products.map((p) => [p.id, p.precio_venta]));
    expect(byId["545300004"]).toBe(32340); // Antiage: 29400 * 1.10
    expect(byId["512100031"]).toBe(28920); // still 20%
    expect(byId["530700018"]).toBe(19800); // still 20%
  });

  it("aborts on column drift and writes nothing (AC-4)", () => {
    const dir = makeTmpDir();
    const csv = path.join(dir, "drift.csv");
    writeFileSync(
      csv,
      "codigo,nombre,categoria,presentacion,descripcion,en_oferta,tags\n" +
        "1,X,Antiage,50 g,desc,no,a\n",
    );
    const outPath = path.join(dir, "products.json");
    expect(() =>
      runIngest({ csvPath: csv, outPath, env: {}, publicDir: PUBLIC_DIR }),
    ).toThrow(/faltan columnas requeridas:.*precio_costo/);
    expect(existsSync(outPath)).toBe(false);
  });

  it("aborts on a row-level error without leaving a partial file (AC-4)", () => {
    const dir = makeTmpDir();
    const csv = path.join(dir, "bad-row.csv");
    writeFileSync(
      csv,
      `${FULL_HEADER}\n` +
        "1,Ok,Antiage,50 g,desc,10000,no,a\n" +
        "2,Bad,Antiage,50 g,desc,,no,a\n",
    );
    const outPath = path.join(dir, "products.json");
    expect(() =>
      runIngest({ csvPath: csv, outPath, env: {}, publicDir: PUBLIC_DIR }),
    ).toThrow(/ingesta abortada[\s\S]*línea 3/);
    expect(existsSync(outPath)).toBe(false);
  });

  it("every written row has exactly the public schema keys (AC-5)", () => {
    const { outPath } = ingestSample({ MARGIN_PERCENT_DEFAULT: "20" });
    const rows = JSON.parse(readFileSync(outPath, "utf-8")) as Record<string, unknown>[];
    const allowed = new Set<string>(PRODUCT_KEYS);
    for (const row of rows) expect(new Set(Object.keys(row))).toEqual(allowed);
  });
});
