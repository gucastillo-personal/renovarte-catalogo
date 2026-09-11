import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  PRODUCT_KEYS,
  REQUIRED_PRODUCT_KEYS,
  validateProducts,
  type Product,
} from "@/lib/types";

import { buildCatalog, buildCatalogFromCsv } from "../../scripts/lib/build-catalog";
import type { CostRow } from "../../scripts/lib/cost-row";
import {
  parseARSNumber,
  parseBoolean,
  parseTags,
  readCsvCostRows,
  validateColumns,
} from "../../scripts/lib/sources/csv";
import {
  buildPublicProduct,
  computeSalePrice,
  resolveMargin,
  toProductsJson,
} from "../../scripts/lib/pricing";

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
  const row: CostRow = {
    codigo: "900",
    nombre: "Serum",
    categoria: "Antiage",
    presentacion: "30 ml",
    descripcion: "desc",
    precio_costo: 10000,
    en_oferta: true,
    tags: ["a", "b"],
    imagen: "/img/placeholder.svg",
  };

  it("emits exactly the required schema keys (no offer), no cost", () => {
    const product = buildPublicProduct(row, { margin: 20 });
    expect(Object.keys(product)).toEqual([...REQUIRED_PRODUCT_KEYS]);
    expect(product).not.toHaveProperty("precio_costo");
    expect(product).not.toHaveProperty("margen");
  });

  it("computes precio_venta from cost + margin and carries public fields", () => {
    const product = buildPublicProduct(row, { margin: 20 });
    expect(product.precio_venta).toBe(12000);
    expect(product.id).toBe("900");
    expect(product.proveedor).toBe("LACA");
    expect(product.en_oferta).toBe(true);
    expect(product.tags).toEqual(["a", "b"]);
  });

  it("with a discount (spec 0007): adds precio_regular/descuento_pct, in schema order", () => {
    const product = buildPublicProduct(row, { margin: 20, descuentoPct: 10 });
    expect(Object.keys(product)).toEqual([
      "id", "proveedor", "categoria", "nombre", "presentacion", "descripcion",
      "precio_venta", "precio_regular", "descuento_pct", "imagen", "en_oferta", "tags",
    ]);
    expect(product.precio_regular).toBe(12000); // base (margin only)
    expect(product.descuento_pct).toBe(10);
    expect(product.precio_venta).toBe(10800); // round(12000 * 0.9)
  });

  it("descuentoPct: 0 behaves like no discount", () => {
    const product = buildPublicProduct(row, { margin: 20, descuentoPct: 0 });
    expect(product).not.toHaveProperty("precio_regular");
    expect(product).not.toHaveProperty("descuento_pct");
    expect(product.precio_venta).toBe(12000);
  });
});

describe("readCsvCostRows", () => {
  it("trims fields and parses numbers / tags / booleans", () => {
    const dir = makeTmpDir();
    const csv = path.join(dir, "one.csv");
    writeFileSync(
      csv,
      `${FULL_HEADER}\n` +
        ` 900 , Serum , Antiage , 30 ml , desc ,10.000, si , a|b \n`,
    );
    const { rows } = readCsvCostRows(csv, { publicDir: PUBLIC_DIR });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      codigo: "900",
      nombre: "Serum",
      precio_costo: 10000,
      en_oferta: true,
      tags: ["a", "b"],
    });
  });

  it("throws when a required field value is empty, naming the line", () => {
    const dir = makeTmpDir();
    const csv = path.join(dir, "bad.csv");
    writeFileSync(csv, `${FULL_HEADER}\n1,X,Antiage,50 g,desc,,no,a\n`);
    expect(() => readCsvCostRows(csv, { publicDir: PUBLIC_DIR })).toThrow(
      /línea 2: campo "precio_costo" vacío/,
    );
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

describe("buildCatalogFromCsv", () => {
  function ingestSample(env: Record<string, string | undefined>) {
    const outPath = path.join(makeTmpDir(), "products.json");
    const result = buildCatalogFromCsv({ csvPath: SAMPLE_CSV, outPath, env, publicDir: PUBLIC_DIR });
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
    buildCatalogFromCsv({ csvPath: SAMPLE_CSV, outPath, env, publicDir: PUBLIC_DIR });
    const first = readFileSync(outPath, "utf-8");
    buildCatalogFromCsv({ csvPath: SAMPLE_CSV, outPath, env, publicDir: PUBLIC_DIR });
    expect(readFileSync(outPath, "utf-8")).toBe(first);
  });

  it("applies MARGIN_PERCENT_DEFAULT to every product (AC-2)", () => {
    const { result } = ingestSample({ MARGIN_PERCENT_DEFAULT: "35" });
    const byId = Object.fromEntries(result.products.map((p: { id: string; precio_venta: number }) => [p.id, p.precio_venta]));
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
    const byId = Object.fromEntries(result.products.map((p: { id: string; precio_venta: number }) => [p.id, p.precio_venta]));
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
      buildCatalogFromCsv({ csvPath: csv, outPath, env: {}, publicDir: PUBLIC_DIR }),
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
      buildCatalogFromCsv({ csvPath: csv, outPath, env: {}, publicDir: PUBLIC_DIR }),
    ).toThrow(/ingesta abortada[\s\S]*línea 3/);
    expect(existsSync(outPath)).toBe(false);
  });

  it("every written row has the required keys and only allowed ones (AC-5)", () => {
    const { outPath } = ingestSample({ MARGIN_PERCENT_DEFAULT: "20" });
    const rows = JSON.parse(readFileSync(outPath, "utf-8")) as Record<string, unknown>[];
    const allowed = new Set<string>(PRODUCT_KEYS);
    for (const row of rows) {
      const keys = new Set(Object.keys(row));
      for (const required of REQUIRED_PRODUCT_KEYS) expect(keys.has(required)).toBe(true);
      for (const key of keys) expect(allowed.has(key)).toBe(true);
    }
  });
});

describe("buildCatalog category cleanup (spec 0009 AC-5)", () => {
  const baseRow: CostRow = {
    codigo: "1",
    nombre: "X",
    categoria: "",
    presentacion: "50 g",
    descripcion: "d",
    precio_costo: 100,
    en_oferta: false,
    tags: [],
    imagen: "/img/placeholder.svg",
  };

  it("strips trailing dots and merges typo duplicates", () => {
    const outPath = path.join(makeTmpDir(), "products.json");
    const { products } = buildCatalog(
      [
        { ...baseRow, codigo: "1", categoria: "Uñas." },
        { ...baseRow, codigo: "2", categoria: "Uñas" },
        { ...baseRow, codigo: "3", categoria: "Proteccion Solar." },
      ],
      { env: { MARGIN_PERCENT_DEFAULT: "20" }, outPath },
    );
    const cats = new Set(products.map((p) => p.categoria));
    expect(cats).toEqual(new Set(["Uñas", "Protección Solar"]));
    for (const c of cats) expect(c.endsWith(".")).toBe(false);
  });
});

describe("buildCatalog offers (spec 0005)", () => {
  const row = (codigo: string): CostRow => ({
    codigo,
    nombre: `P${codigo}`,
    categoria: "Antiage",
    presentacion: "50 g",
    descripcion: "d",
    precio_costo: 100,
    en_oferta: false,
    tags: [],
    imagen: "/img/placeholder.svg",
  });

  it("flags en_oferta only for codes in the offers map", () => {
    const outPath = path.join(makeTmpDir(), "products.json");
    const { products } = buildCatalog([row("1"), row("2"), row("3")], {
      env: { MARGIN_PERCENT_DEFAULT: "20" },
      outPath,
      offers: new Map([["2", { descuentoPct: 0 }]]),
    });
    expect(Object.fromEntries(products.map((p) => [p.id, p.en_oferta]))).toEqual({
      "1": false,
      "2": true,
      "3": false,
    });
  });

  it("applies descuentoPct to precio_venta and keeps precio_regular (spec 0007)", () => {
    const outPath = path.join(makeTmpDir(), "products.json");
    const { products } = buildCatalog([row("1"), row("2")], {
      env: { MARGIN_PERCENT_DEFAULT: "20" }, // precio_venta base = 100 * 1.2 = 120
      outPath,
      offers: new Map([["2", { descuentoPct: 10 }]]),
    });
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    expect(byId["1"]!.precio_venta).toBe(120);
    expect(byId["1"]).not.toHaveProperty("precio_regular");
    expect(byId["2"]!.precio_venta).toBe(108); // round(120 * 0.9)
    expect(byId["2"]!.precio_regular).toBe(120);
    expect(byId["2"]!.descuento_pct).toBe(10);
  });

  it("leaves everything false without an offers map", () => {
    const outPath = path.join(makeTmpDir(), "products.json");
    const { products } = buildCatalog([row("1"), row("2")], {
      env: { MARGIN_PERCENT_DEFAULT: "20" },
      outPath,
    });
    expect(products.every((p) => p.en_oferta === false)).toBe(true);
  });
});
