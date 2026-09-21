import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogView } from "@/components/CatalogView";
import { CategoryNav } from "@/components/CategoryNav";
import { GroupCategoryNav } from "@/components/GroupCategoryNav";
import {
  categoriaFromSlug,
  getCategoriaGrupos,
  getCategoryList,
  getGrupoSlug,
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

  // ux.md "Multi-grupo" point 4: a categoria can belong to 0, 1 or 2+
  // groups. Nivel 1 only highlights a chip when the mapping is
  // unambiguous (exactly one); 0 or 2+ leaves nivel 1 with nothing active
  // — nivel 2 (below) still marks the current categoria unambiguously via
  // its own aria-current, and shows the union of categories across every
  // group involved when there's more than one.
  const grupos = getCategoriaGrupos(categoria);
  const grupoActivo = grupos.length === 1 ? grupos[0] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-sage-800">
        {categoria}
      </h1>

      <CategoryNav
        activeSlug={slug}
        activeGrupoSlug={grupoActivo && getGrupoSlug(grupoActivo)}
      />
      <GroupCategoryNav grupos={grupos} activeCategoriaSlug={slug} />

      <CatalogView products={products} />
    </div>
  );
}
