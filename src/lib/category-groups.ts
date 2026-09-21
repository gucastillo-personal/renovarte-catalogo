/**
 * High-level category group ids (spec 0015 — RF-13). `codCategoria` is the
 * raw Serlaca group id, published by `renovarte-pipeline` (spec espejo
 * 0001) in `products.json`. This module only fixes the **shape** of that
 * id (which values exist and their order) — it deliberately carries no
 * visible name: those come from `public/data/serlaca_category_groups.json`,
 * the pipeline's own file (see `src/lib/products.ts`), not from a constant
 * hardcoded in this repo.
 */
export const CATEGORY_GROUP_IDS = ["1", "2", "3", "4"] as const;

export type CodCategoria = (typeof CATEGORY_GROUP_IDS)[number];

export function isCodCategoria(value: string): value is CodCategoria {
  return (CATEGORY_GROUP_IDS as readonly string[]).includes(value);
}
