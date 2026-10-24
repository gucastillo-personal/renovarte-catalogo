"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/CartProvider";
import { useChatWidget } from "@/components/chat/ChatProvider";
import { anuncioCombo, resultadoCombo } from "@/lib/cart/copy";
import {
  MAX_POR_LINEA,
  addCombo,
  unidadesDisponibles,
  type CartProductInput,
} from "@/lib/cart/model";
import { comboKey } from "@/lib/chat/reducer";
import type { ComboEntry } from "@/lib/chat/types";

const NIVEL_LABEL: Record<ComboEntry["nivel"], string> = {
  mas_barato: "Más barato",
  medio: "Medio",
  premium: "Premium",
};

/**
 * "Agregar combo al carrito" de una `ChatComboCard` (spec 0017, F17; ux.md
 * "Card de combo"). Suma 1 unidad de cada producto, sin cerrar el panel, sin
 * navegar y sin tocar el hilo (AC-7). El botón nunca se deshabilita: tras
 * sumar pasa a "Agregar otra vez" (mismo nodo, así no se pierde el foco).
 */
export function ChatComboAddToCart({
  combo,
  messageId,
  headingId,
}: {
  combo: ComboEntry;
  messageId: string;
  /** `id` del `h3` del nivel: el botón lo referencia con `aria-describedby`. */
  headingId: string;
}) {
  const { update, unidades, pathname, requestHeadingFocus } = useCart();
  const { state, closeChat, registerComboAdded, announceInChat } = useChatWidget();
  const key = comboKey(messageId, combo.nivel);
  const agregado = state.combosAgregados[key];
  const n = combo.items.length;
  const nivel = NIVEL_LABEL[combo.nivel];

  const onAdd = () => {
    let sumados = 0;
    let enCarrito = 0;
    update((current) => {
      const cantidadDe = (id: string) => current.find((l) => l.producto_id === id)?.cantidad ?? 0;
      sumados = combo.items.filter((i) => cantidadDe(i.producto_id) < MAX_POR_LINEA).length;
      // El combo no trae imagen: se conserva la de la línea existente; si es nueva, `/carrito`
      // la completa al revalidar contra el catálogo vigente (AC-15).
      const productos: CartProductInput[] = combo.items.map((i) => ({
        id: i.producto_id,
        nombre: i.nombre,
        presentacion: i.presentacion,
        imagen: current.find((l) => l.producto_id === i.producto_id)?.imagen ?? "",
        precio_venta: i.precio_venta,
      }));
      const r = addCombo(current, productos);
      enCarrito = unidadesDisponibles(r.lines);
      return sumados === 0 ? current : r.lines;
    });
    registerComboAdded(key, sumados, n);
    announceInChat(anuncioCombo(nivel, sumados, n, enCarrito));
  };

  const onVerCarrito = () => {
    // Ya en `/carrito` no hay navegación: se cierra devolviendo el foco al disparador.
    if (pathname?.replace(/\/+$/, "") === "/carrito") {
      closeChat();
      return;
    }
    requestHeadingFocus();
    closeChat({ restoreFocus: false });
  };

  // Para el lector: no mostrar la línea hasta que haya pasado algo.
  const mostrarResultado = agregado !== undefined;
  const sumados = agregado?.sumados ?? 0;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <button
        type="button"
        onClick={onAdd}
        aria-describedby={headingId}
        className="w-full rounded-lg bg-sage-500 px-5 py-3 font-medium text-beige-50 transition-colors hover:bg-sage-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
      >
        {agregado !== undefined && agregado.veces > 0 ? "Agregar otra vez" : "Agregar combo al carrito"}
        <span className="sr-only"> ({n} productos)</span>
      </button>
      {mostrarResultado && (
        <p
          className="text-sm text-sage-700 motion-safe:animate-[chat-combo-in_200ms_ease-out]"
          data-testid="chat-combo-resultado"
        >
          {sumados > 0 ? "✓ " : ""}
          {resultadoCombo(sumados, agregado.total, unidades)}{" "}
          <Link
            href="/carrito"
            onClick={onVerCarrito}
            className="font-semibold underline underline-offset-4 hover:text-sage-900"
          >
            Ver carrito
          </Link>
        </p>
      )}
    </div>
  );
}
