/**
 * serlaca API source adapter (spec 0009), split in two stages:
 *
 *   Stage 1 — fetchAllSerlacaPages(): download RAW, untransformed `dataObjects`.
 *   Stage 2 — rawToCostRows(): filter + map a raw dump into `CostRow[]`.
 *
 * Reference: docs/serlaca-api.md. Runs LOCALLY — never in the browser or the
 * Vercel runtime. `apiKey` comes from `.env` / `.env.local` (`SERLACA_API_KEY`,
 * no `NEXT_PUBLIC_`).
 */
import type { CostRow } from "../cost-row";
import { cleanName, formatSize, htmlToText } from "../html";

const ENDPOINT = "https://api.serlaca.com/Products/ReadProducts";
export const DEFAULT_IMAGE_BASE = "https://api.serlaca.com";
const PLACEHOLDER_IMAGE = "/img/placeholder.svg";

export interface SerlacaProduct {
  productCode: string;
  name: string;
  detail: string | null;
  productLine: { name: string } | null;
  productSize: { size: number; measurementCode: string } | null;
  /** RenovArte's cost (distributor account, con IVA). The margin is added on top. */
  price: number;
  imageURL: string | null;
  professionalExclusive: boolean;
}

interface RawPage {
  currentPage: number;
  totalPages: number;
  dataObjects: unknown[];
}

interface RawEnvelope {
  payload: RawPage | null;
  error: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// ---------------------------------------------------------------------------
// Stage 1 — download raw
// ---------------------------------------------------------------------------

export interface FetchAllOptions {
  apiKey: string;
  lacaId: string;
  /** `productCategoryIds` filter; `[]` = whole catalogue. */
  categoryIds?: number[];
  /** Injected for tests. Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
  /** Base backoff in ms between retries (doubles each attempt). */
  retryBaseMs?: number;
}

export interface RawDump {
  dataObjects: unknown[];
  meta: { totalItems: number; pages: number };
}

/**
 * Walk every page of `Products/ReadProducts` and return the concatenated
 * `dataObjects` **exactly as the API returns them** — no filtering, no field
 * validation, no mapping (that is the transform stage). Only the envelope is
 * checked. Throws on auth failure, an error envelope, an unexpected shape, or
 * exhausted retries.
 */
export async function fetchAllSerlacaPages(opts: FetchAllOptions): Promise<RawDump> {
  const {
    apiKey,
    lacaId,
    categoryIds = [],
    fetchImpl = globalThis.fetch,
    timeoutMs = 15_000,
    maxRetries = 2,
    retryBaseMs = 500,
  } = opts;

  if (!apiKey) throw new Error("falta SERLACA_API_KEY");
  if (!lacaId) throw new Error("falta SERLACA_LACA_ID");

  const dataObjects: unknown[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const payload = await fetchPage(page);
    totalPages =
      Number.isFinite(payload.totalPages) && payload.totalPages > 0
        ? payload.totalPages
        : 1;
    dataObjects.push(...payload.dataObjects);
    page += 1;
  } while (page <= totalPages);

  return { dataObjects, meta: { totalItems: dataObjects.length, pages: totalPages } };

  async function fetchPage(currentPage: number): Promise<RawPage> {
    const body = JSON.stringify({
      currentPage,
      productLineCodes: [],
      productCompositionIds: [],
      productNecessityIds: [],
      productCategoryIds: categoryIds,
      productUseInIds: [],
      searchText: "",
      lacaId,
    });

    for (let attempt = 1; ; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;
      try {
        res = await fetchImpl(ENDPOINT, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            apikey: apiKey,
            username: lacaId,
            origin: "https://www.serlaca.com",
            referer: "https://www.serlaca.com/",
          },
          body,
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timer);
        if (attempt > maxRetries) {
          throw new Error(
            `error de red pidiendo la página ${currentPage}: ${(error as Error).message}`,
          );
        }
        await backoff(attempt, retryBaseMs);
        continue;
      }
      clearTimeout(timer);

      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `serlaca respondió ${res.status}: SERLACA_API_KEY inválida, vencida o sin permisos`,
        );
      }
      if ((res.status === 429 || res.status >= 500) && attempt <= maxRetries) {
        await backoff(attempt, retryBaseMs);
        continue;
      }
      if (!res.ok) {
        throw new Error(`serlaca respondió ${res.status} en la página ${currentPage}`);
      }

      const json = (await res.json()) as RawEnvelope;
      if (json.error != null) {
        throw new Error(`serlaca devolvió un error: ${JSON.stringify(json.error)}`);
      }
      if (!json.payload || !Array.isArray(json.payload.dataObjects)) {
        throw new Error(
          `respuesta inesperada en la página ${currentPage}: falta payload.dataObjects`,
        );
      }
      return json.payload;
    }
  }
}

async function backoff(attempt: number, baseMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, baseMs * 2 ** (attempt - 1)));
}

// ---------------------------------------------------------------------------
// Stage 2 — transform raw -> CostRow
// ---------------------------------------------------------------------------

/** Validate the fields the transform reads; throw naming the first bad one. */
export function assertSerlacaProduct(
  value: unknown,
  index: number,
): asserts value is SerlacaProduct {
  if (!isRecord(value)) throw new Error(`producto ${index}: no es un objeto`);
  for (const key of ["productCode", "name"] as const) {
    if (typeof value[key] !== "string" || value[key] === "") {
      throw new Error(`producto ${index}: falta el campo "${key}"`);
    }
  }
  if (typeof value.price !== "number" || !Number.isFinite(value.price)) {
    throw new Error(`producto ${index}: "price" ausente o no numérico`);
  }
  if (!isRecord(value.productLine) || typeof value.productLine.name !== "string") {
    throw new Error(`producto ${index}: falta "productLine.name"`);
  }
  if (typeof value.professionalExclusive !== "boolean") {
    throw new Error(`producto ${index}: falta "professionalExclusive"`);
  }
}

export interface MapOptions {
  /** Base for building absolute image URLs from `imageURL`. */
  imageBase: string;
}

/** One `SerlacaProduct` -> one `CostRow`. Assumes `assertSerlacaProduct` passed. */
export function mapToCostRow(product: SerlacaProduct, opts: MapOptions): CostRow {
  return {
    codigo: product.productCode.trim(),
    nombre: cleanName(product.name),
    categoria: product.productLine!.name.trim(),
    presentacion: formatSize(product.productSize),
    descripcion: htmlToText(product.detail),
    // `price` IS RenovArte's cost; the margin is added later in `buildCatalog`.
    precio_costo: product.price,
    en_oferta: false,
    tags: [],
    imagen: product.imageURL ? `${opts.imageBase}${product.imageURL}` : PLACEHOLDER_IMAGE,
  };
}

export interface RawToCostRowsOptions {
  imageBase?: string;
}

/**
 * A raw serlaca dump -> `CostRow[]`: validate each object, drop
 * professional-exclusive products, map the rest.
 */
export function rawToCostRows(
  dataObjects: unknown[],
  opts: RawToCostRowsOptions = {},
): { rows: CostRow[]; warnings: string[] } {
  const imageBase = opts.imageBase ?? DEFAULT_IMAGE_BASE;
  const warnings: string[] = [];
  const rows: CostRow[] = [];
  let excluded = 0;

  dataObjects.forEach((obj, index) => {
    assertSerlacaProduct(obj, index);
    if (obj.professionalExclusive) {
      excluded += 1;
      return;
    }
    rows.push(mapToCostRow(obj, { imageBase }));
  });

  if (excluded > 0) {
    warnings.push(`${excluded} producto(s) profesional-exclusivo(s) excluido(s) del catálogo`);
  }
  if (rows.length === 0) {
    throw new Error(
      "el crudo no tiene productos publicables (¿todo profesional-exclusivo?)",
    );
  }

  return { rows, warnings };
}
