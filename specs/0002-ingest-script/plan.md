# 0002 — Ingest script · Plan

Checked against [`../constitution.md`](../constitution.md). Implements RFC-0001
§2.2 / §2.3 / §2.6. The internal margin report (RFC §2.4) is **out** — spec 0007.

## Shape

A thin CLI wrapping a pure, testable core. No subprocess or env hooks in tests.

```
scripts/
├── ingest.ts            # CLI: load .env.local, call runIngest, print, exit 1 on error
└── lib/
    ├── transform.ts     # pure functions (parsing, margin, price, build, serialize)
    ├── images.ts        # resolveImagePath() — filesystem lookup only
    └── run.ts           # runIngest({csvPath,outPath,env,publicDir}) — orchestrator
data/raw/
├── serlaca_export.csv          # real export (gitignored)
└── serlaca_export.sample.csv   # committed sample (gitignore negation), 3 rows
```

`pnpm ingest` → `tsx scripts/ingest.ts [csvPath]` (default `data/raw/serlaca_export.csv`).

## Dependencies

- `csv-parse` (runtime) — `csv-parse/sync`.
- `dotenv` (runtime) — CLI loads `[".env.local", ".env"]`.
- `tsx` (dev) — runs the TS entrypoint, resolves the `@/*` tsconfig path.

## CSV contract

Expected header (order-independent). Validation reads the header row and aborts
naming every missing **required** column before any row is processed.

| Column | Required | Notes |
|---|---|---|
| `codigo` | ✔ | product id; non-empty |
| `nombre` | ✔ | |
| `categoria` | ✔ | drives the per-category margin lookup |
| `presentacion` | ✔ | |
| `descripcion` | ✔ | |
| `precio_costo` | ✔ | parsed by `parseARSNumber` |
| `en_oferta` | ✖ | `parseBoolean`; absent ⇒ `false` |
| `tags` | ✖ | `|`- or `,`-separated; absent ⇒ `[]` |

`data/raw/serlaca_export.sample.csv` carries the same 3 products already in
`public/data/products.json` (same ids/names) with plausible fake costs, so
running ingest keeps the site and tests stable.

## `scripts/lib/transform.ts` (pure)

- `REQUIRED_COLUMNS`, `OPTIONAL_COLUMNS` — string arrays.
- `validateColumns(headers: string[]): void` — throws `Error` listing missing
  required columns (RF drift guard, PRD §8).
- `parseARSNumber(raw: string): number` — handles `"28000"`, `"28.000"`,
  `"28000,50"`, `"$ 28.000,50"`, surrounding spaces. Throws on non-numeric.
- `parseBoolean(raw: string | undefined): boolean` — `sí/si/true/1/x` ⇒ true;
  `""/no/false/0/undefined` ⇒ false (trim, lowercase).
- `parseTags(raw: string | undefined): string[]` — split `/[|,]/`, trim, drop empty.
- `resolveMargin(categoria: string, env: NodeJS.ProcessEnv): number` — key
  `MARGIN_PERCENT_${categoria.toUpperCase().replace(/\s/g, "_")}`, else
  `MARGIN_PERCENT_DEFAULT`, else `20` (RFC §2.3/§2.6). Throws if the resolved
  value is not a finite number `>= 0`.
- `computeSalePrice(costo: number, marginPercent: number): number` —
  `Math.round(costo * (1 + marginPercent / 100))` (RFC §2.3).
- `buildPublicProduct(row, { margin, imagen }): Product` — returns an object with
  **exactly** `PRODUCT_KEYS` from [`@/lib/types`](../../src/lib/types.ts), in
  schema order, `proveedor: "LACA"`. No cost/margin key is ever set.
- `toProductsJson(products: Product[]): string` — sort by `id` asc,
  `JSON.stringify(_, null, 2)` + trailing `\n` (idempotent output).

## `scripts/lib/images.ts`

- `resolveImagePath(codigo, publicDir): string` — first existing of
  `img/laca/<codigo>.{jpg,jpeg,webp,png,svg}` ⇒ `/img/laca/<codigo>.<ext>`, else
  `/img/placeholder.svg`. Add `public/img/placeholder.svg`.

## `scripts/lib/run.ts`

`runIngest({ csvPath, outPath, env, publicDir }): { products: Product[]; warnings: string[] }`

1. Read `csvPath`; `parse(text, { columns: h => (validateColumns(h), h), skip_empty_lines: true, trim: true, bom: true })`.
2. Per row, collect errors (empty `codigo`, `parseARSNumber` throw). If **any**
   row errors: throw `Error` with all messages joined — **nothing is written**
   (AC-4).
3. Build products: `resolveMargin` → `computeSalePrice` → `resolveImagePath` →
   `buildPublicProduct`.
4. Final gate: `validateProducts(built)` from `@/lib/types` (reuse) — guarantees
   ingest output always satisfies the app's contract.
5. `warnings`: e.g. category with no explicit margin env (used default), image
   fell back to placeholder.
6. Write `toProductsJson(built)` to `outPath` (only on full success).

## `scripts/ingest.ts`

```ts
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
// csvPath = process.argv[2] ?? "data/raw/serlaca_export.csv"
// try { runIngest({ csvPath, outPath: "public/data/products.json",
//                    env: process.env, publicDir: "public" }) }
// catch → console.error, process.exit(1)
// success → print "N productos, M en oferta → public/data/products.json"
//           + note: margin report is spec 0007
```

## Tests — `tests/unit/ingest.test.ts`

Pure functions (fixtures inline as strings, no files):
- `validateColumns` ok / missing → throws naming the column.
- `parseARSNumber` the 5 formats above + throws on `"abc"`.
- `parseBoolean`, `parseTags` truth tables (incl. `undefined`).
- `resolveMargin` default / category override / bad env value throws.
- `computeSalePrice` known values + rounding.
- `buildPublicProduct` → key set === `PRODUCT_KEYS`, no `costo`/`margen`,
  `precio_venta` computed.
- `toProductsJson` sorted by id, ends with `\n`.

Orchestrator (temp dir via `node:os` tmpdir + `node:fs`):
- `runIngest` on the sample CSV → writes a file; parsing it back through
  `validateProducts` passes; product count === sample rows (AC-1).
- **Idempotency (AC-3):** run twice → byte-identical output.
- **Margin from env (AC-2):** `env.MARGIN_PERCENT_DEFAULT = "35"` changes every
  price; `env.MARGIN_PERCENT_ANTIAGE = "10"` overrides only the Antiage row.
- **Column drift (AC-4):** a header missing `precio_costo` → `runIngest` throws
  and the output file is **not created / not modified**.
- **Leak guard (AC-5):** the written JSON's keys === `PRODUCT_KEYS` for every row.

`tests/e2e` unchanged (site still renders the regenerated data).

## Wiring

- `package.json`: `+ "ingest": "tsx scripts/ingest.ts"`; deps `csv-parse`,
  `dotenv`; devDep `tsx`.
- `.gitignore`: change `/data/raw/` → `/data/raw/*` + `!/data/raw/serlaca_export.sample.csv`
  so the sample is tracked but real exports stay ignored.
- `vitest.config.mts`: already has the `@` alias — no change needed
  (`run.ts`/`transform.ts` import `@/lib/types`).
- Regenerate `public/data/products.json` from the sample and commit it.
- `README.md`: replace the "datos semilla" note — the update flow is now real
  for the public JSON (report still pending in 0007).

## Verification

```
pnpm ingest data/raw/serlaca_export.sample.csv   # regenerates public/data/products.json
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm check:leak && pnpm test:e2e
git diff --stat public/data/products.json         # empty on a second run (idempotent)
```
