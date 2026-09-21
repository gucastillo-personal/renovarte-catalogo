import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogView } from "@/components/CatalogView";
import { CategoryNav } from "@/components/CategoryNav";
import { GroupCategoryNav } from "@/components/GroupCategoryNav";
import {
  getGroupList,
  getGrupoNombre,
  getProductsByGrupo,
  grupoFromSlug,
} from "@/lib/products";

// Only the slugs from generateStaticParams exist; anything else 404s. With
// today's data (no codCategoria yet — spec 0015, Fase 1) getGroupList() is
// [], so this generates 0 /grupo/* pages, by design, until renovarte-pipeline
// publishes codCategoria (Fase 2).
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return getGroupList().map((group) => ({ slug: group.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/grupo/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const grupo = grupoFromSlug(slug);
  if (!grupo) return {};
  const nombre = getGrupoNombre(grupo);
  return {
    title: nombre,
    description: `Productos de ${nombre} en el catálogo de RenovArte.`,
  };
}

export default async function GroupPage({ params }: PageProps<"/grupo/[slug]">) {
  const { slug } = await params;
  const grupo = grupoFromSlug(slug);
  if (!grupo) notFound();

  const nombre = getGrupoNombre(grupo);
  const products = getProductsByGrupo(grupo);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-sage-800">{nombre}</h1>

      <CategoryNav activeGrupoSlug={slug} />
      <GroupCategoryNav grupos={[grupo]} />

      <CatalogView products={products} />
    </div>
  );
}
