"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { flushSync } from "react-dom";

import { CartClearControl } from "@/components/cart/CartClearControl";
import { CartEmpty } from "@/components/cart/CartEmpty";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { CartNotice } from "@/components/cart/CartNotice";
import { useCart } from "@/components/cart/CartProvider";
import { CartSummary } from "@/components/cart/CartSummary";
import { CartUndoRow } from "@/components/cart/CartUndoRow";
import { FOCUS_ATTR, type CartFocusKey } from "@/components/cart/focus-keys";
import { useChatWidget } from "@/components/chat/ChatProvider";
import { OrderConfirmation } from "@/components/orders/OrderConfirmation";
import { OrderForm, type OrderFormSubmit } from "@/components/orders/OrderForm";
import { OrderSendBanner } from "@/components/orders/OrderSendBanner";
import type { CartCatalog } from "@/lib/cart/catalog-slim";
import {
  ANUNCIO_ENVIANDO,
  ANUNCIO_VACIADO,
  AVISO_PRECIOS_ACTUALIZADOS,
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
import { applyRechazoCatalogo, revalidateCart, type PriceNote } from "@/lib/cart/revalidate";
import { createCheckout, INITIAL_STATE } from "@/lib/orders/checkout";
import { defaultPorts, fetchEstado } from "@/lib/orders/client";
import {
  readConfirmation,
  writeConfirmation,
  type Confirmation,
} from "@/lib/orders/confirmation-store";
import { browserSessionStorage, clearDraft } from "@/lib/orders/contact-draft";
import { orderText } from "@/lib/orders/order-text";
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
  /** Enviando la orden: stepper, "Quitar", "Deshacer" y "Vaciar" deshabilitados. */
  sending?: boolean;
  /** Tras un 409 (AC-15): el aviso de arriba es el de "precios actualizados" y recibe el foco. */
  rechazo?: boolean;
  avisoRef?: RefObject<HTMLDivElement | null>;
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
  sending = false,
  rechazo = false,
  avisoRef,
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
      disabled={sending}
    />
  ));
  if (undo) {
    rows.splice(
      Math.min(undo.index, rows.length),
      0,
      <CartUndoRow
        key={`undo-${undo.line.producto_id}`}
        nombre={undo.line.nombre}
        onUndo={actions.onUndo}
        disabled={sending}
      />,
    );
  }

  const hayDisponibles = unidades > 0;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_380px] md:gap-10">
      <div className="flex flex-col gap-6">
        {heading}
        {rechazo ? (
          <CartNotice ref={avisoRef} focusable title={AVISO_PRECIOS_ACTUALIZADOS} items={avisos} />
        ) : (
          avisos.length > 0 && <CartNotice title={AVISO_REVALIDACION} items={avisos} />
        )}
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
              disabled={sending}
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
  const avisoRef = useRef<HTMLDivElement>(null);
  const [focoAviso, setFocoAviso] = useState(0);
  const [ports] = useState(() => defaultPorts());
  const [checkout] = useState(() =>
    createCheckout({
      ports,
      randomUUID: () => crypto.randomUUID(),
      storage: browserSessionStorage(),
    }),
  );
  const envio = useSyncExternalStore(checkout.subscribe, checkout.getState, () => INITIAL_STATE);
  // Solo se ve una vez montado (`ready`): leerlo acá no produce mismatch de hidratación.
  const [confirmation, setConfirmation] = useState<Confirmation | null>(() =>
    readConfirmation(browserSessionStorage()),
  );
  // `GET /v1/estado` al montar devolvió `tope_alcanzado` (ux.md "tope avisado al entrar").
  const [topeEntrada, setTopeEntrada] = useState(false);
  const estadoPedido = useRef(false);

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

  // F14: al montar con líneas disponibles, se pide el estado: token para el envío o tope avisado.
  // `no_disponible` y los errores no cambian nada visible (no bloquean, RFC §3.1).
  const hayDisponibles = unidadesDisponibles(lines) > 0;
  const ready = mounted && notas !== null;
  useEffect(() => {
    if (!ready || confirmation || !hayDisponibles || estadoPedido.current) return;
    estadoPedido.current = true;
    void fetchEstado(ports).then((estado) => {
      if (estado.kind === "disponible") {
        if (checkout.getState().status !== "enviando") {
          checkout.adoptToken(estado.form_token, estado.emitidoEn);
        }
      } else if (estado.kind === "tope_alcanzado") {
        setTopeEntrada(true);
      }
    });
  }, [ready, confirmation, hayDisponibles, ports, checkout]);

  // Tras un 409 el foco va al aviso de "precios actualizados" (ux.md).
  useEffect(() => {
    if (focoAviso > 0) avisoRef.current?.focus();
  }, [focoAviso]);

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

  const sending = envio.status === "enviando";

  const sendOrder = async (data: OrderFormSubmit) => {
    announce(ANUNCIO_ENVIANDO);
    const enviadas = lines.filter(isDisponible);
    const resultado = await checkout.submit({
      lines,
      nombre: data.nombre,
      telefono: data.telefono,
      honeypot: data.honeypot,
    });
    if (!resultado) return; // Segundo toque durante el envío: sin efecto (AC-24).
    if (resultado.status === "confirmada") {
      const conf: Confirmation = {
        numero_orden: resultado.numero_orden,
        lineas: enviadas.map((l) => ({
          nombre: l.nombre,
          presentacion: l.presentacion,
          cantidad: l.cantidad,
          precio: l.precio_visto,
        })),
        total: total(enviadas),
        // La respuesta no trae el nombre: es el mismo valor normalizado que se envió.
        nombre: data.nombre,
        telefono: data.telefono,
      };
      const storage = browserSessionStorage();
      writeConfirmation(storage, conf);
      clearDraft(storage);
      // Primero la confirmación, así el carrito vacío nunca se ve un instante.
      flushSync(() => setConfirmation(conf));
      update(() => clear());
      setUndo(null);
    } else if (resultado.status === "rechazada_por_catalogo") {
      let nuevas: PriceNote[] = [];
      update((current) => {
        const r = applyRechazoCatalogo(current, {
          v: 1,
          resultado: "rechazada_por_catalogo",
          lineas: resultado.lineas,
          total_vigente: resultado.total_vigente,
        });
        nuevas = r.notas;
        return r.lines;
      });
      setNotas((prev) => [
        ...(prev ?? []).filter((n) => !nuevas.some((m) => m.producto_id === n.producto_id)),
        ...nuevas,
      ]);
      setUndo(null);
      setFocoAviso((n) => n + 1);
    }
  };

  const detalle = orderText(lines);

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

  if (ready && confirmation) {
    return (
      <div ref={rootRef}>
        <OrderConfirmation confirmation={confirmation} />
      </div>
    );
  }

  const form = topeEntrada ? (
    <OrderSendBanner variant="tope-entrada" detalle={detalle} />
  ) : (
    <OrderForm
      onValidSubmit={(data) => void sendOrder(data)}
      enviando={sending}
      serverErrors={envio.status === "invalida" && !envio.general ? envio.errores : undefined}
      generalError={
        envio.status === "invalida" && envio.general ? (
          <OrderSendBanner variant="general" detalle={detalle} />
        ) : undefined
      }
      banner={
        envio.status === "fallida"
          ? { variant: "falla", detalle }
          : envio.status === "tope"
            ? { variant: "tope", detalle }
            : undefined
      }
    />
  );

  return (
    <div ref={rootRef}>
      <CartViewContent
        ready={ready}
        lines={lines}
        notas={notas ?? []}
        undo={undo}
        confirmingClear={confirmingClear}
        actions={actions}
        headingRef={headingRef}
        form={form}
        sending={sending}
        rechazo={envio.status === "rechazada_por_catalogo"}
        avisoRef={avisoRef}
      />
    </div>
  );
}
