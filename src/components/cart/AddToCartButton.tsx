"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/CartProvider";
import {
  NOSCRIPT_FICHA,
  NOTA_MAXIMO,
  anuncioAgregado,
  anuncioYaEnMaximo,
} from "@/lib/cart/copy";
import { MAX_POR_LINEA, addProduct, type CartProductInput } from "@/lib/cart/model";
import { useMounted } from "@/lib/use-mounted";

export interface AddToCartButtonViewProps {
  /** `false` antes de hidratar: el botón está en el HTML pero inerte. */
  mounted: boolean;
  /** Unidades de este producto que ya están en el carrito (0 si no está). */
  cantidad: number;
  onAdd(): void;
}

/**
 * Zona de agregar de la ficha (ux.md "Ficha de producto", punto 3). Vista
 * pura, testeable con `renderToStaticMarkup`. Sin `ul > li` (el test e2e
 * `main ul > li` cuenta cards del catálogo).
 */
export function AddToCartButtonView({ mounted, cantidad, onAdd }: AddToCartButtonViewProps) {
  const enCarrito = mounted && cantidad > 0;
  return (
    <div className="flex flex-col gap-2">
      {/*
        Nunca `disabled`: en el máximo, tocarlo no suma pero el botón sigue
        vivo para explicar por qué y para no perder el foco (Q-F2c).
      */}
      <button
        type="button"
        onClick={onAdd}
        tabIndex={mounted ? 0 : -1}
        className={`w-full rounded-lg bg-sage-500 px-5 py-3 font-medium text-beige-50 transition-colors hover:bg-sage-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 md:w-fit ${
          mounted ? "" : "pointer-events-none"
        }`}
      >
        Agregar al carrito
      </button>
      {/* Línea de estado: refleja siempre la cantidad real de la línea. Su alto se reserva para no mover la ficha. */}
      <p className="min-h-5 text-sm text-sage-700">
        {enCarrito && (
          <>
            ✓ En tu carrito: {cantidad} ·{" "}
            <Link
              href="/carrito"
              className="font-semibold underline underline-offset-4 hover:text-sage-900"
            >
              Ver carrito
            </Link>
          </>
        )}
      </p>
      {enCarrito && cantidad >= MAX_POR_LINEA && (
        <p className="text-sm text-sage-700">{NOTA_MAXIMO}</p>
      )}
      <noscript>
        <p className="text-sm text-sage-700">{NOSCRIPT_FICHA}</p>
      </noscript>
    </div>
  );
}

/** Botón "Agregar al carrito" de la ficha: +1 por toque (AC-4), el foco queda en el botón. */
export function AddToCartButton({ product }: { product: CartProductInput }) {
  const mounted = useMounted();
  const { lines, update, announce } = useCart();
  const cantidad = lines.find((l) => l.producto_id === product.id)?.cantidad ?? 0;

  const onAdd = () => {
    let topeado = false;
    let enCarrito = 0;
    update((current) => {
      const r = addProduct(current, product);
      topeado = r.topeado;
      if (topeado) return current;
      enCarrito = r.lines.find((l) => l.producto_id === product.id)?.cantidad ?? 0;
      return r.lines;
    });
    announce(topeado ? anuncioYaEnMaximo(product.nombre) : anuncioAgregado(product.nombre, enCarrito));
  };

  return <AddToCartButtonView mounted={mounted} cantidad={cantidad} onAdd={onAdd} />;
}
