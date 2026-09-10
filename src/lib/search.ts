/**
 * Client-side catalog search (spec 0004). Pure and framework-free so it can run
 * in the browser and be unit-tested directly. No fuzzy ranking — plain
 * accent- and case-insensitive substring match on the product name (RF-03).
 */
import type { Product } from "@/lib/types";

// Combining diacritical marks (U+0300–U+036F), left after NFD normalization.
const DIACRITICS = /[̀-ͯ]/g;

/** Lowercase, accent-stripped, trimmed — the form both query and haystack compare in. */
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim();
}

/**
 * Products whose name (or, secondarily, a tag) contains the query. An empty or
 * whitespace-only query returns the list unchanged; order is preserved.
 */
export function matchProducts(query: string, products: Product[]): Product[] {
  const q = normalizeText(query);
  if (q === "") return products;
  return products.filter((product) => {
    if (normalizeText(product.nombre).includes(q)) return true;
    return product.tags.some((tag) => normalizeText(tag).includes(q));
  });
}
