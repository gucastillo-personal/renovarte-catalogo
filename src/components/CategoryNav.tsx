import Link from "next/link";

import { getCategoryList, getProductsOnOffer } from "@/lib/products";

const CHIP =
  "rounded-full px-3 py-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500";
const INACTIVE = "bg-sage-100 text-sage-700 hover:bg-sage-200";
const ACTIVE = "bg-sage-500 text-beige-50";
const OFFERS = "bg-sage-100 text-sage-800 hover:bg-sage-200";

/**
 * Row of category chips (spec 0003) + an "Ofertas" chip when there are offers
 * (spec 0005). Server component — just links. `activeSlug` highlights one chip
 * ("todos" when undefined, "ofertas" on /ofertas).
 */
export function CategoryNav({ activeSlug }: { activeSlug?: string }) {
  const categories = getCategoryList();
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

      {categories.map((category) => {
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
