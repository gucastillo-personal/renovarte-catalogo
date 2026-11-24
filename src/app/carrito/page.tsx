import type { Metadata } from "next";
import Link from "next/link";

import { CartView } from "@/components/cart/CartView";
import { toCartCatalog } from "@/lib/cart/catalog-slim";
import { NOSCRIPT_CARRITO } from "@/lib/cart/copy";
import { getAllProducts } from "@/lib/products";

// Sin contenido útil para buscadores: el carrito sale del estado del navegador (ux.md).
export const metadata: Metadata = {
  title: "Tu carrito",
  robots: { index: false },
};

/**
 * Shell estático de `/carrito` (spec 0017, F8; AC-14: sin runtime propio). El
 * contenido sale del estado del navegador; el servidor solo aporta el catálogo
 * reducido a 5 campos por producto (AC-16) para revalidar. El padding inferior
 * deja libre el FAB del chat al final del scroll (ux.md, ítem 9: >= 104px
 * contando el `py-8` de `<main>`).
 */
export default function CarritoPage() {
  const catalogo = toCartCatalog(getAllProducts());
  return (
    <div className="pb-28">
      <CartView catalogo={catalogo} />
      <noscript>
        <div className="mt-6 flex flex-col gap-3 text-sage-700">
          <p>{NOSCRIPT_CARRITO}</p>
          <Link
            href="/"
            className="self-start text-sm font-medium text-sage-600 underline underline-offset-4 hover:text-sage-800"
          >
            ← Volver al catálogo
          </Link>
        </div>
      </noscript>
    </div>
  );
}
