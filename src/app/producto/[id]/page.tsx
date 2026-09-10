import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OfferBadge } from "@/components/OfferBadge";
import { slugifyCategoria } from "@/lib/category-slug";
import { formatARS } from "@/lib/format";
import { getAllProducts, getProductById } from "@/lib/products";

// Only the ids returned by generateStaticParams exist; anything else 404s.
export const dynamicParams = false;

export function generateStaticParams(): { id: string }[] {
  return getAllProducts().map((product) => ({ id: product.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/producto/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) return {};
  return {
    title: product.nombre,
    description: product.descripcion,
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/producto/[id]">) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  return (
    <article className="flex flex-col gap-8 md:flex-row md:gap-12">
      <div className="w-full md:max-w-sm">
        <div className="overflow-hidden rounded-lg border border-beige-200 bg-beige-100">
          <Image
            src={product.imagen}
            alt={product.nombre}
            width={640}
            height={640}
            unoptimized
            priority
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/categoria/${slugifyCategoria(product.categoria)}`}
            className="rounded bg-sage-100 px-2 py-0.5 text-sm text-sage-700 hover:bg-sage-200"
          >
            {product.categoria}
          </Link>
          {product.en_oferta && <OfferBadge className="text-sm" />}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-sage-900">
          {product.nombre}
        </h1>
        <p className="text-sage-600">{product.presentacion}</p>
        <p className="text-3xl font-semibold text-sage-900">
          {formatARS(product.precio_venta)}
        </p>

        <p className="max-w-prose leading-relaxed text-sage-700">
          {product.descripcion}
        </p>

        <Link
          href="/"
          className="mt-2 inline-block text-sm font-medium text-sage-600 underline underline-offset-4 hover:text-sage-800"
        >
          ← Volver al catálogo
        </Link>
      </div>
    </article>
  );
}
