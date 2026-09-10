import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { PRODUCT_KEYS, validateProducts } from "@/lib/types";

import { buildCatalog } from "../../scripts/lib/build-catalog";
import {
  fetchAllSerlacaPages,
  mapToCostRow,
  rawToCostRows,
  type SerlacaProduct,
} from "../../scripts/lib/sources/serlaca-api";

const FIXTURE = JSON.parse(
  readFileSync(path.join(process.cwd(), "tests", "fixtures", "serlaca-api-response.json"), "utf-8"),
) as { payload: { dataObjects: unknown[] } };
const RAW_OBJECTS = FIXTURE.payload.dataObjects;

const tmpDirs: string[] = [];
afterEach(() => {
  while (tmpDirs.length) rmSync(tmpDirs.pop()!, { recursive: true, force: true });
});
function tmpOut(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "api-transform-"));
  tmpDirs.push(dir);
  return path.join(dir, "products.json");
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function serlacaProduct(code: string, over: Partial<SerlacaProduct> = {}): SerlacaProduct {
  return {
    productCode: code,
    name: `PROD ${code}`,
    detail: null,
    productLine: { name: "Línea Test" },
    productSize: { size: 100, measurementCode: "mL" },
    price: 1000,
    imageURL: null,
    professionalExclusive: false,
    ...over,
  };
}

const CREDS = { apiKey: "k", lacaId: "34797703" };

// ---------------------------------------------------------------------------
// Stage 1 — fetchAllSerlacaPages (raw, no transformation)
// ---------------------------------------------------------------------------

describe("fetchAllSerlacaPages", () => {
  it("returns raw dataObjects untouched, including professional-exclusive", async () => {
    const fetchImpl = (() =>
      jsonResponse({
        payload: { currentPage: 1, totalPages: 1, dataObjects: RAW_OBJECTS },
        error: null,
      })) as unknown as typeof fetch;

    const { dataObjects, meta } = await fetchAllSerlacaPages({ ...CREDS, fetchImpl });
    expect(dataObjects).toEqual(RAW_OBJECTS); // byte-for-byte, no filtering/mapping
    expect(meta.totalItems).toBe(12);
    const profCount = (dataObjects as SerlacaProduct[]).filter(
      (p) => p.professionalExclusive,
    ).length;
    expect(profCount).toBe(2);
  });

  it("walks every page", async () => {
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      const { currentPage } = JSON.parse(String(init.body)) as { currentPage: number };
      return jsonResponse({
        payload: {
          currentPage,
          totalPages: 3,
          dataObjects: [serlacaProduct(`p${currentPage}`)],
        },
        error: null,
      });
    }) as unknown as typeof fetch;

    const { dataObjects } = await fetchAllSerlacaPages({ ...CREDS, fetchImpl });
    expect((dataObjects as SerlacaProduct[]).map((p) => p.productCode)).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
  });

  it("throws on an error envelope", async () => {
    const fetchImpl = (() =>
      jsonResponse({ payload: null, error: { code: "BOOM" } })) as unknown as typeof fetch;
    await expect(fetchAllSerlacaPages({ ...CREDS, fetchImpl })).rejects.toThrow(
      /serlaca devolvió un error/,
    );
  });

  it("throws a credential error on 401", async () => {
    const fetchImpl = (() => jsonResponse({}, 401)) as unknown as typeof fetch;
    await expect(fetchAllSerlacaPages({ ...CREDS, fetchImpl })).rejects.toThrow(
      /SERLACA_API_KEY inválida/,
    );
  });

  it("retries 500s and then aborts", async () => {
    let calls = 0;
    const fetchImpl = (() => {
      calls += 1;
      return jsonResponse({}, 500);
    }) as unknown as typeof fetch;
    await expect(
      fetchAllSerlacaPages({ ...CREDS, fetchImpl, maxRetries: 2, retryBaseMs: 0 }),
    ).rejects.toThrow(/serlaca respondió 500/);
    expect(calls).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Stage 2 — rawToCostRows / mapToCostRow
// ---------------------------------------------------------------------------

describe("mapToCostRow", () => {
  it("maps a serlaca product to a CostRow — price is the cost (con IVA)", () => {
    const row = mapToCostRow(
      serlacaProduct("506530004", {
        name: "LAPIZ SECATIVO X 3.5 G",
        detail: "<p>Seca y <strong>descongestiona</strong> el acn&eacute;.</p>",
        productLine: { name: "Pieles Grasas" },
        productSize: { size: 3.5, measurementCode: "g" },
        price: 17600,
        imageURL: "/files/Products/lapiz.jpg",
      }),
      { imageBase: "https://www.laboratoriolaca.com" },
    );

    expect(row).toEqual({
      codigo: "506530004",
      nombre: "Lapiz Secativo X 3.5 G",
      categoria: "Pieles Grasas",
      presentacion: "3.5 g",
      descripcion: "Seca y descongestiona el acné.",
      precio_costo: 17600,
      en_oferta: false,
      tags: [],
      imagen: "https://www.laboratoriolaca.com/files/Products/lapiz.jpg",
    });
  });

  it("uses the placeholder when imageURL is null", () => {
    const row = mapToCostRow(serlacaProduct("x"), {
      imageBase: "https://www.laboratoriolaca.com",
    });
    expect(row.imagen).toBe("/img/placeholder.svg");
  });

  it("defaults the image host to laboratoriolaca.com (not api.serlaca.com)", () => {
    const { rows } = rawToCostRows([
      serlacaProduct("y", { imageURL: "/files/Products/foo.png" }),
    ]);
    expect(rows[0]!.imagen).toBe("https://www.laboratoriolaca.com/files/Products/foo.png");
  });
});

describe("rawToCostRows", () => {
  it("drops professional-exclusive products and maps the rest", () => {
    const { rows, warnings } = rawToCostRows(RAW_OBJECTS);
    expect(rows).toHaveLength(10); // 12 - 2
    expect(rows.map((r) => r.codigo)).not.toContain("510500003");
    expect(rows.map((r) => r.codigo)).not.toContain("506120003");
    expect(warnings.join(" ")).toMatch(/2 producto\(s\) profesional-exclusivo/);
  });

  it("throws naming a missing field (shape drift)", () => {
    const bad = { ...serlacaProduct("B") } as Record<string, unknown>;
    delete bad.price;
    expect(() => rawToCostRows([serlacaProduct("A"), bad])).toThrow(/producto 1: "price"/);
  });
});

describe("API source end to end (fetch stubbed)", () => {
  it("fetch -> rawToCostRows -> buildCatalog -> valid, idempotent products.json", async () => {
    const fetchImpl = (() =>
      jsonResponse({
        payload: { currentPage: 1, totalPages: 1, dataObjects: RAW_OBJECTS },
        error: null,
      })) as unknown as typeof fetch;

    const { dataObjects } = await fetchAllSerlacaPages({ ...CREDS, fetchImpl });
    const { rows } = rawToCostRows(dataObjects);
    const outPath = tmpOut();
    const env = { MARGIN_PERCENT_DEFAULT: "25" };

    const first = buildCatalog(rows, { env, outPath });
    expect(first.products).toHaveLength(10);

    const written: unknown = JSON.parse(readFileSync(outPath, "utf-8"));
    expect(() => validateProducts(written)).not.toThrow();
    const allowed = new Set<string>(PRODUCT_KEYS);
    for (const p of written as Record<string, unknown>[]) {
      expect(new Set(Object.keys(p))).toEqual(allowed);
      expect(String((p as { categoria: string }).categoria).endsWith(".")).toBe(false);
    }

    const snapshot = readFileSync(outPath, "utf-8");
    buildCatalog(rows, { env, outPath });
    expect(readFileSync(outPath, "utf-8")).toBe(snapshot);
  });
});
