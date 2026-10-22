"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";

import { CartClearControl } from "@/components/cart/CartClearControl";
import { CartEmpty } from "@/components/cart/CartEmpty";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { CartNotice } from "@/components/cart/CartNotice";
import { useCart } from "@/components/cart/CartProvider";
import { CartSummary } from "@/components/cart/CartSummary";
import { CartUndoRow } from "@/components/cart/CartUndoRow";
import { FOCUS_ATTR, type CartFocusKey } from "@/components/cart/focus-keys";
import { useChatWidget } from "@/components/chat/ChatProvider";
import { OrderForm } from "@/components/orders/OrderForm";
import type { CartCatalog } from "@/lib/cart/catalog-slim";
import {
  ANUNCIO_VACIADO,
  AVISO_REVALIDACION,
  SIN_DISPONIBLES,
  anuncioCantidad,
  anuncioQuitado,
  itemsAvisoRevalidacion,
  productosLabel,
} from "@/lib/cart/copy";
import {
  MAX_POR_LINEA,
  clear,
  isDisponible,
  removeLine,
  restoreLine,
  setCantidad,
  total,
  unidadesDisponibles,
  type CartLine,
} from "@/lib/cart/model";
import { revalidateCart, type PriceNote } from "@/lib/cart/revalidate";
import { useMounted } from "@/lib/use-mounted";

export interface UndoState {
  line: CartLine;
  index: number;
}

export interface CartViewActions {
  onMinus(productoId: string): void;
  onPlus(productoId: string): void;
  onRemove(productoId: string): void;
  onUndo(): void;
  onAskClear(): void;
  onCancelClear(): void;
  onConfirmClear(): void;
  onAskColibri(trigger: HTMLElement): void;
}

export interface CartViewContentProps {
  /** `false` hasta hidratar y revalidar: se ve solo el `h1` (sin un "vacío" que parpadee a "lleno"). */
  ready: boolean;
  lines: readonly CartLine[];
  /** Notas "El precio cambió" de la revalidación (en memoria). */
  notas: readonly PriceNote[];
  undo: UndoState | null;
  confirmingClear: boolean;
  actions: CartViewActions;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  /** "Tus datos" (`OrderForm`): va dentro de la caja de resumen cuando hay productos disponibles. */
  form?: React.ReactNode;
}

const LINK_BTN =
  "rounded text-sm font-medium text-sage-600 underline underline-offset-4 hover:text-sage-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500";

/**
 * Contenido de `/carrito` (ux.md "Página /carrito"): presentación pura,
 * testeable con `renderToStaticMarkup`. El formulario entra por `form` (F12);
 * el envío real llega en F13.
 */
export function CartViewContent({
  ready,
  lines,
  notas,
  undo,
  confirmingClear,
  actions,
  headingRef,
  form,
}: CartViewContentProps) {
  const unidades = unidadesDisponibles(lines);

  const heading = (
    <div className="flex items-baseline justify-between gap-4">
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl text-sage-900 focus:outline-none">
        Tu carrito
      </h1>
      {ready && unidades > 0 && <p className="text-sage-600">{productosLabel(unidades)}</p>}
    </div>
  );

  if (!ready) return <div className="flex flex-col gap-6">{heading}</div>;

  if (lines.length === 0 && !undo) {
    return (
      <div className="flex flex-col gap-6">
        {heading}
        <CartEmpty onAskColibri={actions.onAskColibri} />
      </div>
    );
  }

  // Avisos derivados de lo que hay ahora: si se quita la línea afectada, el aviso se achica.
  const idsConNota = new Set(lines.map((l) => l.producto_id));
  const precios = notas.filter((n) => idsConNota.has(n.producto_id));
  const noDisponibles = lines.filter((l) => !isDisponible(l)).length;
  const avisos = itemsAvisoRevalidacion(precios.length, noDisponibles);
  const notaPorId = new Map(precios.map((n) => [n.producto_id, n]));

  // La fila "Quitaste… Deshacer" ocupa la posición de la línea quitada.
  const rows: React.ReactNode[] = lines.map((line) => (
    <CartLineItem
      key={line.producto_id}
      line={line}
      nota={notaPorId.get(line.producto_id)}
      onMinus={() => actions.onMinus(line.producto_id)}
      onPlus={() => actions.onPlus(line.producto_id)}
      onRemove={() => actions.onRemove(line.producto_id)}
    />
  ));
  if (undo) {
    rows.splice(
      Math.min(undo.index, rows.length),
      0,
      <CartUndoRow key={`undo-${undo.line.producto_id}`} nombre={undo.line.nombre} onUndo={actions.onUndo} />,
    );
  }

  const hayDisponibles = unidades > 0;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_380px] md:gap-10">
      <div className="flex flex-col gap-6">
        {heading}
        {avisos.length > 0 && <CartNotice title={AVISO_REVALIDACION} items={avisos} />}
        <ul aria-label="Productos en tu carrito" className="flex flex-col border-t border-beige-200">
          {rows}
        </ul>
        {lines.length === 0 ? (
          <CartEmpty onAskColibri={actions.onAskColibri} />
        ) : (
          <>
            <CartClearControl
              confirming={confirmingClear}
              onAsk={actions.onAskClear}
              onCancel={actions.onCancelClear}
              onConfirm={actions.onConfirmClear}
            />
            <Link href="/" className={`self-start ${LINK_BTN}`}>
              ← Seguir comprando
            </Link>
          </>
        )}
      </div>
      {lines.length > 0 && (
        // Sticky solo con alto de ventana suficiente (ux.md): si no, fluye normal.
        <div className="md:self-start md:[@media(min-height:760px)]:sticky md:[@media(min-height:760px)]:top-[88px]">
          <CartSummary unidades={unidades} total={total(lines)}>
            {hayDisponibles ? form : <p className="text-sage-700">{SIN_DISPONIBLES}</p>}
          </CartSummary>
        </div>
      )}
    </div>
  );
}

/** `/carrito`: estado del carrito, revalidación al montar y reglas de foco de ux.md. */
export function CartView({ catalogo }: { catalogo: CartCatalog }) {
  const mounted = useMounted();
  const { lines, update, announce, consumeHeadingFocus } = useCart();
  const { openChat } = useChatWidget();
  const [notas, setNotas] = useState<readonly PriceNote[] | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<CartFocusKey | null>(null);
  const revalidated = useRef(false);

  // AC-15: cada vez que se abre `/carrito`, el carrito se contrasta con el catálogo vigente.
  useEffect(() => {
    if (revalidated.current) return;
    revalidated.current = true;
    let found: PriceNote[] = [];
    update((current) => {
      const r = revalidateCart(current, catalogo);
      found = r.notas;
      return r.lines;
    });
    if (consumeHeadingFocus()) pendingFocus.current = "heading";
    setNotas(found);
  }, [catalogo, update, consumeHeadingFocus]);

  // El foco nunca queda en `body`: el botón que lo tenía pudo deshabilitarse o desmontarse.
  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = null;
    if (key === "heading") {
      headingRef.current?.focus();
      return;
    }
    const safe = key.replace(/["\\]/g, "\\$&");
    rootRef.current?.querySelector<HTMLElement>(`[${FOCUS_ATTR}="${safe}"]`)?.focus();
  });

  const change = (productoId: string, delta: 1 | -1) => {
    const line = lines.find((l) => l.producto_id === productoId);
    if (!line) return;
    const next = Math.min(Math.max(line.cantidad + delta, 1), MAX_POR_LINEA);
    if (next === line.cantidad) return;
    const after = setCantidad(lines, productoId, next);
    update((current) => setCantidad(current, productoId, next));
    setUndo(null);
    // Si el botón tocado se deshabilita, el foco pasa al otro del stepper.
    if (delta > 0 && next >= MAX_POR_LINEA) pendingFocus.current = `menos:${productoId}`;
    if (delta < 0 && next <= 1) pendingFocus.current = `mas:${productoId}`;
    announce(anuncioCantidad(line.nombre, next, total(after)));
  };

  const actions: CartViewActions = {
    onMinus: (id) => change(id, -1),
    onPlus: (id) => change(id, 1),
    onRemove(id) {
      const r = removeLine(lines, id);
      if (!r.removed) return;
      update((current) => removeLine(current, id).lines);
      setUndo(r.removed);
      pendingFocus.current = "undo";
      announce(anuncioQuitado(r.removed.line.nombre, total(r.lines)));
    },
    onUndo() {
      if (!undo) return;
      const { line, index } = undo;
      update((current) => restoreLine(current, line, index));
      setUndo(null);
      pendingFocus.current = `quitar:${line.producto_id}`;
    },
    onAskClear() {
      setConfirmingClear(true);
      pendingFocus.current = "clear-cancel";
    },
    onCancelClear() {
      setConfirmingClear(false);
      pendingFocus.current = "clear";
    },
    onConfirmClear() {
      update(() => clear());
      setUndo(null);
      setConfirmingClear(false);
      pendingFocus.current = "heading";
      announce(ANUNCIO_VACIADO);
    },
    onAskColibri: (trigger) => openChat(trigger),
  };

  return (
    <div ref={rootRef}>
      <CartViewContent
        ready={mounted && notas !== null}
        lines={lines}
        notas={notas ?? []}
        undo={undo}
        confirmingClear={confirmingClear}
        actions={actions}
        headingRef={headingRef}
        form={<OrderForm />}
      />
    </div>
  );
}
