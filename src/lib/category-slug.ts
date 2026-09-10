/**
 * Category name -> URL slug (spec 0003). Not reversible on its own: the route
 * looks up the category whose slug matches (see `categoriaFromSlug` in
 * `products.ts`). Pure and client-safe.
 */

// Combining diacritical marks (U+0300–U+036F), left after NFD normalization.
const DIACRITICS = /[̀-ͯ]/g;

export function slugifyCategoria(name: string): string {
  return name
    .normalize("NFD")
    .replace(DIACRITICS, "") // "Protección" -> "Proteccion"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // spaces, dots, slashes -> "-"
    .replace(/^-+|-+$/g, "");
}
