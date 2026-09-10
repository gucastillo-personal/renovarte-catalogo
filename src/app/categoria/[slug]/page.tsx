import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogView } from "@/components/CatalogView";
import { CategoryNav } from "@/components/CategoryNav";
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
      <h1 className="text-2xl font-semibold tracking-tight text-sage-800">
        {categoria}
      </h1>

      <CategoryNav activeSlug={slug} />

      <CatalogView products={products} />
    </div>
  );
}
