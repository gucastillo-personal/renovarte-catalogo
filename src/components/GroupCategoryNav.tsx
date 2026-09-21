import Link from "next/link";

import { type CodCategoria } from "@/lib/category-groups";
import { ACTIVE, CHIP_SM, INACTIVE } from "@/lib/chip-styles";
import { getCategoryListForGrupos, getGrupoNombre } from "@/lib/products";

/**
 * Nivel 2 (spec 0015 — RF-13, per `ux.md`): the specific categories within
 * one or more chosen groups, so RF-02's granularity isn't lost. Server
 * component, same pattern as `CategoryNav`: `getCategoryListForGrupos(grupos)`
 * -> a row of chips to `/categoria/<slug>`, `aria-current="page"` on the
 * active one.
 *
 * `grupos` is always an array — usually one group (`/grupo/[slug]`, or
 * `/categoria/[slug]` when that categoria belongs to exactly one group),
 * but can be 2+ when a categoria belongs to more than one group at once
 * (`ux.md` "Multi-grupo" point 4): in that case this shows the **union**
 * of their specific categories, deduplicated by slug, and the visible
 * label/`aria-labelledby` list every group name involved.
 *
 * A visible eyebrow label ("Categorías de {grupo(s)}", small-caps style
 * per `docs/brand.md`'s "SPA DE PIEL" treatment) sits above the row and
 * doubles as the row's accessible name via `aria-labelledby` — before
 * `ux.md` this distinction only existed in `aria-label`, invisible to a
 * sighted user. Renders nothing when `grupos` is empty (no group context
 * to nest under — same graceful-degradation stance as the rest of Fase 1).
 */
export function GroupCategoryNav({
  grupos,
  activeCategoriaSlug,
}: {
  grupos: CodCategoria[];
  activeCategoriaSlug?: string;
}) {
  if (grupos.length === 0) return null;

  const categories = getCategoryListForGrupos(grupos);
  const nombreGrupos = grupos.map((g) => getGrupoNombre(g)).join(" + ");
  const labelId = "group-category-nav-label";

  return (
    <div className="flex flex-col gap-1.5">
      <p id={labelId} className="text-xs uppercase tracking-[0.2em] text-sage-600">
        Categorías de {nombreGrupos}
      </p>
      <nav aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
        {categories.map((category) => {
          const isActive = category.slug === activeCategoriaSlug;
          return (
            <Link
              key={category.slug}
              href={`/categoria/${category.slug}`}
              aria-current={isActive ? "page" : undefined}
              className={`${CHIP_SM} ${isActive ? ACTIVE : INACTIVE}`}
            >
              {category.nombre}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
