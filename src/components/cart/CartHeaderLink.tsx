"use client";

import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { useMounted } from "@/lib/use-mounted";

/** `aria-label` del acceso (ux.md "Accesibilidad"): el número va acá, no en el contador visual. */
export function cartLinkLabel(count: number): string {
  if (count <= 0) return "Carrito, vacío";
  return `Carrito, ${count} ${count === 1 ? "producto" : "productos"}`;
}

export interface CartHeaderLinkViewProps {
  count: number;
  /** `false` antes de hidratar: el link navega igual, pero sin contador ni label dinámico. */
  mounted: boolean;
  /** `true` en `/carrito`. */
  current: boolean;
  /** Cambia cada vez que el número sube: remonta el contador y reinicia su escala de 320 ms. */
  pulse?: number;
}

/** Presentación pura del acceso al carrito (testeable con `renderToStaticMarkup`). */
export function CartHeaderLinkView({ count, mounted, current, pulse = 0 }: CartHeaderLinkViewProps) {
  const showCount = mounted && count > 0;
  return (
    <Link
      href="/carrito"
      aria-label={mounted ? cartLinkLabel(count) : "Carrito"}
      aria-current={current ? "page" : undefined}
      className="relative flex min-h-11 items-center gap-2 rounded-full px-3 text-sage-800 transition-colors hover:bg-sage-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 shrink-0"
      >
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </svg>
      <span className="hidden font-medium sm:inline">Carrito</span>
      {showCount && (
        <span
          key={pulse}
          aria-hidden="true"
          className="absolute top-0 left-6 flex h-5 min-w-5 items-center justify-center rounded-full bg-sage-600 px-1 text-xs font-semibold text-beige-50 tabular-nums motion-safe:animate-[cart-count-pop_320ms_ease-out]"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

/** Acceso al carrito del header: link real desde el primer render, contador al hidratar. */
export function CartHeaderLink() {
  const mounted = useMounted();
  const { unidades, pathname } = useCart();
  const [prev, setPrev] = useState(unidades);
  const [pulse, setPulse] = useState(0);
  if (unidades !== prev) {
    setPrev(unidades);
    if (unidades > prev) setPulse((n) => n + 1);
  }
  return (
    <CartHeaderLinkView
      count={unidades}
      mounted={mounted}
      current={pathname === "/carrito"}
      pulse={pulse}
    />
  );
}
