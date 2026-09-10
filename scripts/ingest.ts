/**
 * Catalog ingest CLI (spec 0002).
 *
 *   pnpm ingest [path/to/serlaca_export.csv]
 *
 * Runs LOCALLY only — never on Vercel. Reads real cost from the serlaca CSV,
 * applies `MARGIN_PERCENT_*` (from .env.local, no `NEXT_PUBLIC_` prefix), and
 * regenerates `public/data/products.json` with public fields only. The internal
 * margin report is spec 0007.
 */
import path from "node:path";

import { config } from "dotenv";

import { runIngest } from "./lib/run";

config({ path: [".env.local", ".env"], quiet: true });

const cwd = process.cwd();
const csvPath = process.argv[2] ?? path.join("data", "raw", "serlaca_export.csv");
const outPath = path.join("public", "data", "products.json");

try {
  const { products, warnings } = runIngest({
    csvPath,
    outPath,
    env: process.env,
    publicDir: path.join(cwd, "public"),
  });

  for (const warning of warnings) console.warn(`⚠  ${warning}`);

  const offers = products.filter((p) => p.en_oferta).length;
  console.log(
    `✓ ${products.length} producto(s) (${offers} en oferta) → ${outPath}`,
  );
  console.log("  Reporte de márgenes: pendiente (spec 0007).");
} catch (error) {
  console.error(`✗ ${(error as Error).message}`);
  process.exit(1);
}
