import Image from "next/image";
import Link from "next/link";

import { FOCUS_ATTR, type CartFocusKey } from "@/components/cart/focus-keys";
import { QuantityStepper } from "@/components/cart/QuantityStepper";
import { NOTA_MAXIMO } from "@/lib/cart/copy";
import { MAX_POR_LINEA, subtotal, type CartLine } from "@/lib/cart/model";
import type { PriceNote } from "@/lib/cart/revalidate";
import { formatARS } from "@/lib/format";

export interface CartLineItemProps {
  line: CartLine;
  /** Nota "El precio cambió" de la revalidación, si la hay. */
  nota?: PriceNote;
  onMinus(): void;
  onPlus(): void;
  onRemove(): void;
  /** Enviando la orden: stepper y "Quitar" deshabilitados. */
  disabled?: boolean;
}

/** Miniatura decorativa (`alt=""`): el nombre está al lado. */
function Thumb({ line, faded }: { line: CartLine; faded: boolean }) {
  return (
    <Image
      src={line.imagen}
      alt=""
      width={72}
      height={72}
      unoptimized
      className={`h-16 w-16 shrink-0 rounded-lg border border-beige-200 bg-beige-100 object-cover md:h-[72px] md:w-[72px] ${
        faded ? "opacity-50" : ""
      }`}
    />
  );
}

/**
 * Una línea del carrito (ux.md "Página /carrito", ítem 3), con su variante
 * "ya no está en el catálogo" (AC-15): atenuada, sin precio, sin stepper y con
 * solo la acción "Quitar".
 */
export function CartLineItem({ line, nota, onMinus, onPlus, onRemove, disabled = false }: CartLineItemProps) {
  const disponible = line.no_disponible !== true;
  const key: CartFocusKey = `quitar:${line.producto_id}`;
  const quitar = (
    <button
      type="button"
      onClick={onRemove}
      disabled={disabled}
      {...{ [FOCUS_ATTR]: key }}
      className="rounded text-sm text-sage-700 underline underline-offset-4 hover:text-sage-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Quitar<span className="sr-only"> {line.nombre}</span>
    </button>
  );

  if (!disponible) {
    return (
      <li className="flex gap-3 border-b border-beige-200 py-4 text-sage-600">
        <Thumb line={line} faded />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-semibold">{line.nombre}</p>
          <p className="text-sm">Ya no está en el catálogo</p>
          <p className="text-sm">No se incluye en la orden</p>
          <div className="pt-1">{quitar}</div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex gap-3 border-b border-beige-200 py-4">
      <Thumb line={line} faded={false} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={`/producto/${line.producto_id}`}
          className="font-semibold text-sage-800 hover:text-sage-600"
        >
          {line.nombre}
        </Link>
        <p className="text-sm text-sage-600 tabular-nums">
          {line.presentacion !== "" && <>{line.presentacion} · </>}
          {formatARS(line.precio_visto)} c/u
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <QuantityStepper
            productoId={line.producto_id}
            nombre={line.nombre}
            cantidad={line.cantidad}
            onMinus={onMinus}
            onPlus={onPlus}
            disabled={disabled}
          />
          {quitar}
          <span className="ml-auto font-semibold tabular-nums text-sage-900">
            <span className="sr-only">Subtotal: </span>
            {formatARS(subtotal(line))}
          </span>
        </div>
        {nota && (
          <p className="text-sm text-sage-700 tabular-nums">
            El precio cambió: antes {formatARS(nota.antes)}, ahora {formatARS(nota.ahora)}.
          </p>
        )}
        {line.cantidad >= MAX_POR_LINEA && (
          <p className="text-sm text-sage-700">{NOTA_MAXIMO}</p>
        )}
      </div>
    </li>
  );
}
