/**
 * ETAPA 1 — descarga (spec 0009).
 *
 *   pnpm ingest
 *
 * Baja el catálogo CRUDO de la API de serlaca (paginado, sin transformar) a
 * `data/input/serlaca-raw.json`. No aplica descuento, margen, filtros ni
 * limpieza — eso es `pnpm transform` (etapa 2).
 *
 * Corre LOCALMENTE. Config (en `.env` / `.env.local`, sin `NEXT_PUBLIC_`):
 *   SERLACA_API_KEY, SERLACA_LACA_ID, SERLACA_CATEGORY_IDS (opcional)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

import { fetchAllSerlacaPages } from "./lib/sources/serlaca-api";

config({ path: [".env.local", ".env"], quiet: true });

const RAW_PATH = path.join("data", "input", "serlaca-raw.json");

function parseCategoryIds(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

async function main(): Promise<void> {
  const env = process.env;
  const args = process.argv.slice(2);

  if (args.some((a) => a.startsWith("--source="))) {
    throw new Error(
      'el CSV ya es el crudo: usá `pnpm transform --in <ruta.csv>`. ' +
        "`pnpm ingest` sólo baja desde la API.",
    );
  }

  const categoryIds = parseCategoryIds(env.SERLACA_CATEGORY_IDS);
  const { dataObjects, meta } = await fetchAllSerlacaPages({
    apiKey: env.SERLACA_API_KEY ?? "",
    lacaId: env.SERLACA_LACA_ID ?? "",
    categoryIds,
  });

  const dump = {
    _meta: {
      fetchedAt: new Date().toISOString(),
      source: "serlaca-api",
      totalItems: meta.totalItems,
      pages: meta.pages,
      categoryIds,
    },
    dataObjects,
  };

  mkdirSync(path.dirname(RAW_PATH), { recursive: true });
  writeFileSync(RAW_PATH, `${JSON.stringify(dump, null, 2)}\n`);

  console.log(
    `✓ ${meta.totalItems} producto(s) crudos (${meta.pages} página(s)) → ${RAW_PATH}`,
  );
  console.log("  Siguiente: pnpm transform");
}

main().catch((error: unknown) => {
  console.error(`✗ ${(error as Error).message}`);
  process.exit(1);
});
