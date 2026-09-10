import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryNav } from "@/components/CategoryNav";
import { ProductGrid } from "@/components/ProductGrid";
import {
  categoriaFromSlug,
  getCategoryList,
  getProductsByCategoria,
} from "@/lib/products";

// Only the slugs from generateStaticParams exist; anything else 404s.
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return getCategoryList().map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/categoria/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const categoria = categoriaFromSlug(slug);
  if (!categoria) return {};
  return {
    title: categoria,
    description: `Productos de ${categoria} en el catálogo de RenovArte.`,
  };
}

export default async function CategoryPage({
  params,
}: PageProps<"/categoria/[slug]">) {
  const { slug } = await params;
  const categoria = categoriaFromSlug(slug);
  if (!categoria) notFound();

  const products = getProductsByCategoria(categoria);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-sage-800">
          {categoria}
        </h1>
        <p className="mt-1 text-sage-600">
          {products.length} producto{products.length === 1 ? "" : "s"}
        </p>
      </div>

      <CategoryNav activeSlug={slug} />

      <ProductGrid products={products} />
    </div>
  );
}
