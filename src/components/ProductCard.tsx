import Image from "next/image";
import Link from "next/link";

import { OfferBadge } from "@/components/OfferBadge";
import { formatARS } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/producto/${product.id}`}
      className="group flex w-full flex-col overflow-hidden rounded-lg border border-beige-200 bg-white transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
    >
      <div className="relative aspect-square bg-beige-100">
        <Image
          src={product.imagen}
          alt={product.nombre}
          width={400}
          height={400}
          unoptimized
          className="h-full w-full object-cover"
        />
        {product.en_oferta && <OfferBadge className="absolute left-2 top-2" />}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h2 className="font-medium leading-snug text-sage-800 group-hover:text-sage-600">
          {product.nombre}
        </h2>
        <p className="text-sm text-sage-600">{product.presentacion}</p>
        <p className="mt-auto pt-2 text-lg font-semibold text-sage-900">
          {formatARS(product.precio_venta)}
        </p>
      </div>
    </Link>
  );
}
