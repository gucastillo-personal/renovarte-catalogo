"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { isDisponible, unidadesDisponibles, type CartLine } from "@/lib/cart/model";
import { createCartStore, type CartStore } from "@/lib/cart/store";

export interface CartContextValue {
  /** Vacío en el servidor y en el primer render del cliente (sin mismatch de hidratación). */
  lines: readonly CartLine[];
  /**
   * Unidades del contador del header: suma de cantidades de las líneas
   * disponibles. Una línea cuyo id ya no está en el catálogo vigente no
   * cuenta en ninguna página (plan.md decisión 3), aunque todavía no se
   * haya marcado `no_disponible` en `/carrito`.
   */
  unidades: number;
  /** Ruta actual (para `aria-current` del acceso del header). */
  pathname: string | null;
  /** Aplica una operación pura de `lib/cart/model` y persiste. */
  update(fn: (lines: readonly CartLine[]) => readonly CartLine[]): void;
  /** Texto para la live region única del sitio (ux.md "Accesibilidad"). */
  announce(message: string): void;
  /** "Ver carrito" desde el chat: pide que `/carrito` enfoque su `h1` al montar. */
  requestHeadingFocus(): void;
  /** `/carrito` lo llama al montar: devuelve y baja el flag. */
  consumeHeadingFocus(): boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}

/** `localStorage` o `null` (servidor, modo privado, bloqueado): el carrito vive en memoria. */
function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Dueño del estado del carrito del sitio. Envuelve a `ChatProvider` (la card
 * de combo, dentro del panel del chat, necesita `useCart`) y renderiza la
 * única live region `role="status"` del sitio, fuera de `<main>`.
 *
 * `catalogIds` son los ids del catálogo vigente (~4,6 KB): permiten que el
 * contador excluya productos que ya no existen en todas las páginas.
 */
export function CartProvider({
  catalogIds,
  children,
}: {
  catalogIds: readonly string[];
  children: React.ReactNode;
}) {
  const [store] = useState<CartStore>(() =>
    createCartStore({
      storage: browserStorage(),
      target: typeof window === "undefined" ? null : window,
    }),
  );
  const lines = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const headingFocus = useRef(false);

  const ids = useMemo(() => new Set(catalogIds), [catalogIds]);
  const unidades = useMemo(
    () => unidadesDisponibles(lines.filter((l) => isDisponible(l) && ids.has(l.producto_id))),
    [lines, ids],
  );

  const announce = useCallback((m: string) => setMessage(m), []);
  const requestHeadingFocus = useCallback(() => {
    headingFocus.current = true;
  }, []);
  const consumeHeadingFocus = useCallback(() => {
    const v = headingFocus.current;
    headingFocus.current = false;
    return v;
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      unidades,
      pathname,
      update: store.update,
      announce,
      requestHeadingFocus,
      consumeHeadingFocus,
    }),
    [lines, unidades, pathname, store, announce, requestHeadingFocus, consumeHeadingFocus],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" className="sr-only">
        {message}
      </div>
    </CartContext.Provider>
  );
}
