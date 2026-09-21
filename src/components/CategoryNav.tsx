import Link from "next/link";

import { ACTIVE, CHIP, INACTIVE, OFFERS } from "@/lib/chip-styles";
import { getCategoryList, getGroupList, getProductsOnOffer } from "@/lib/products";

/**
 * Nivel 1 (spec 0015 — RF-13): "Todos" / "Ofertas" (spec 0005) + either a
 * chip per high-level group, or — while no group has any products yet — a
 * fallback to the original spec 0003 flat list of specific-category chips.
 * Server component — just links. `activeSlug` highlights "Todos"/"Ofertas"
 * (and, in the fallback branch, the active specific category) exactly as
 * spec 0003 did. `activeGrupoSlug` highlights the active group chip when
 * groups are shown.
 *
 * The condition (`ux.md` "Acceso directo a una categoría específica desde
 * /"): while `getGroupList()` is empty (Fase 1, before renovarte-pipeline
 * publishes `codCategoria`), this degrades to *exactly* spec 0003's
 * behavior — the flat category list, one click away, no nivel 2 anywhere
 * — instead of stripping specific-category access down to nothing. Once
 * real groups exist (Fase 2), this switches to one chip per group
 * (`getGroupList()`, fixed business order 1→2→3→4, groups with 0 products
 * omitted) and specific categories move to nivel 2 (`GroupCategoryNav`),
 * one more click away — that's AC-1 taking effect, not a bug.
 */
export function CategoryNav({
  activeSlug,
  activeGrupoSlug,
}: {
  activeSlug?: string;
  activeGrupoSlug?: string;
}) {
  const groups = getGroupList();
  const hasOffers = getProductsOnOffer().length > 0;

  return (
    <nav aria-label="Categorías" className="flex flex-wrap gap-2">
      <Link
        href="/"
        aria-current={activeSlug === undefined ? "page" : undefined}
        className={`${CHIP} ${activeSlug === undefined ? ACTIVE : INACTIVE}`}
      >
        Todos
      </Link>

      {hasOffers && (
        <Link
          href="/ofertas"
          aria-current={activeSlug === "ofertas" ? "page" : undefined}
          className={`${CHIP} ${activeSlug === "ofertas" ? ACTIVE : OFFERS}`}
        >
          Ofertas
        </Link>
      )}

      {groups.length > 0
        ? groups.map((group) => {
            const isActive = group.slug === activeGrupoSlug;
            return (
              <Link
                key={group.slug}
                href={`/grupo/${group.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={`${CHIP} ${isActive ? ACTIVE : INACTIVE}`}
              >
                {group.nombre}
              </Link>
            );
          })
        : getCategoryList().map((category) => {
            const isActive = category.slug === activeSlug;
            return (
              <Link
                key={category.slug}
                href={`/categoria/${category.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={`${CHIP} ${isActive ? ACTIVE : INACTIVE}`}
              >
                {category.nombre}
              </Link>
            );
          })}
    </nav>
  );
}
