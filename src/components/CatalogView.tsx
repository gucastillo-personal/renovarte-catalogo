"use client";

import { useDeferredValue, useState } from "react";

import { ProductGrid } from "@/components/ProductGrid";
import { SearchBox } from "@/components/SearchBox";
import { matchProducts } from "@/lib/search";
import type { Product } from "@/lib/types";

/**
 * Catalog grid + client-side search (spec 0004). Gets the already-loaded product
 * list (home = all, category page = that category) and filters it in the browser
 * — no network, no navigation.
 */
export function CatalogView({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filtered = matchProducts(deferredQuery, products);
  const trimmed = deferredQuery.trim();

  return (
    <div className="flex flex-col gap-4">
      <SearchBox value={query} onChange={setQuery} />

      <p className="text-sm text-sage-600" aria-live="polite">
        {trimmed === ""
          ? `${products.length} producto${products.length === 1 ? "" : "s"}`
          : `${filtered.length} resultado${filtered.length === 1 ? "" : "s"} para «${trimmed}»`}
      </p>

      {filtered.length > 0 ? (
        <ProductGrid products={filtered} />
      ) : (
        <div className="rounded-lg border border-dashed border-beige-300 bg-beige-50 px-4 py-10 text-center text-sage-600">
          <p>No encontramos productos para «{trimmed}».</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-2 text-sm font-medium text-sage-700 underline underline-offset-4 hover:text-sage-900"
          >
            Limpiar búsqueda
          </button>
        </div>
      )}
    </div>
  );
}
