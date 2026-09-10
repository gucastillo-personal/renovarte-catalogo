/**
 * ETAPA 2 — transformación (spec 0009).
 *
 *   pnpm transform                                  # lee data/input/serlaca-raw.json
 *   pnpm transform --in data/input/serlaca-raw.json
 *   pnpm transform --in data/raw/serlaca_export.sample.csv   # fallback CSV
 *
 * Toma el crudo (dump de la API o un CSV), aplica descuento + margen + limpieza
 * de categorías + filtro de profesional-exclusivos, y escribe
 * `public/data/products.json` listo para la app.
 *
 * El `price` del input ES el costo de RenovArte (cuenta de distribuidora):
 *   precio_venta = round(price * (1 + MARGIN_PERCENT/100))
 * Config (en `.env` / `.env.local`, sin `NEXT_PUBLIC_`):
 *   MARGIN_PERCENT_*, SERLACA_IMAGE_BASE
 * El reporte interno de márgenes es la spec 0007.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

import {
  buildCatalog,
  buildCatalogFromCsv,
  type BuildCatalogResult,
} from "./lib/build-catalog";
import { rawToCostRows } from "./lib/sources/serlaca-api";

config({ path: [".env.local", ".env"], quiet: true });

const DEFAULT_IN = path.join("data", "input", "serlaca-raw.json");
const OUT_PATH = path.join("public", "data", "products.json");

function getArg(name: string): string | undefined {
  const args = process.argv.slice(2);
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split("=").slice(1).join("=");
  const flagIndex = args.indexOf(`--${name}`);
  return flagIndex !== -1 ? args[flagIndex + 1] : undefined;
}

async function main(): Promise<void> {
  const env = process.env;
  const inPath = getArg("in") ?? DEFAULT_IN;

  let result: BuildCatalogResult;

  if (inPath.endsWith(".csv")) {
    result = buildCatalogFromCsv({
      csvPath: inPath,
      outPath: OUT_PATH,
      env,
      publicDir: path.join(process.cwd(), "public"),
    });
  } else {
    let dump: { dataObjects?: unknown };
    try {
      dump = JSON.parse(readFileSync(inPath, "utf-8")) as { dataObjects?: unknown };
    } catch (error) {
      throw new Error(
        `no pude leer el crudo en ${inPath} (¿corriste \`pnpm ingest\`?): ${(error as Error).message}`,
      );
    }
    if (!Array.isArray(dump.dataObjects)) {
      throw new Error(`${inPath} no tiene un array \`dataObjects\``);
    }

    const { rows, warnings: mapWarnings } = rawToCostRows(dump.dataObjects, {
      imageBase: env.SERLACA_IMAGE_BASE,
    });
    const built = buildCatalog(rows, { env, outPath: OUT_PATH });
    result = { products: built.products, warnings: [...mapWarnings, ...built.warnings] };
  }

  for (const warning of result.warnings) console.warn(`⚠  ${warning}`);

  const offers = result.products.filter((p) => p.en_oferta).length;
  console.log(
    `✓ ${result.products.length} producto(s) (${offers} en oferta) → ${OUT_PATH}`,
  );
  console.log("  Reporte de márgenes: pendiente (spec 0007).");
}

main().catch((error: unknown) => {
  console.error(`✗ ${(error as Error).message}`);
  process.exit(1);
});
