import type { Metadata } from "next";
import Link from "next/link";

import { CatalogView } from "@/components/CatalogView";
import { CategoryNav } from "@/components/CategoryNav";
import { getProductsOnOffer } from "@/lib/products";

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Productos en oferta del catálogo de RenovArte.",
};

export default function OffersPage() {
  const products = getProductsOnOffer();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-sage-800">Ofertas</h1>

      {products.length === 0 ? (
        <p className="text-sage-600">
          No hay ofertas en este momento.{" "}
          <Link
            href="/"
            className="font-medium text-sage-700 underline underline-offset-4 hover:text-sage-900"
          >
            Ver el catálogo
          </Link>
          .
        </p>
      ) : (
        <>
          <CategoryNav activeSlug="ofertas" />
          <CatalogView products={products} />
        </>
      )}
    </div>
  );
}
