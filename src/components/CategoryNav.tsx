import Link from "next/link";

import { getCategoryList } from "@/lib/products";

const CHIP =
  "rounded-full px-3 py-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500";
const INACTIVE = "bg-beige-100 text-sage-700 hover:bg-beige-200";
const ACTIVE = "bg-sage-600 text-beige-50";

/**
 * Row of category chips (spec 0003). Server component — just links. `activeSlug`
 * highlights one chip; when undefined, the "Todos" chip is active.
 */
export function CategoryNav({ activeSlug }: { activeSlug?: string }) {
  const categories = getCategoryList();

  return (
    <nav aria-label="Categorías" className="flex flex-wrap gap-2">
      <Link
        href="/"
        aria-current={activeSlug === undefined ? "page" : undefined}
        className={`${CHIP} ${activeSlug === undefined ? ACTIVE : INACTIVE}`}
      >
        Todos
      </Link>
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
