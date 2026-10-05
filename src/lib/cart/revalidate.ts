import type { CartCatalog } from "@/lib/cart/catalog-slim";
import type { CartLine } from "@/lib/cart/model";
import type { CrearOrdenResponse } from "@/lib/orders/wire";

/** Aviso "el precio cambió": antes y ahora, para la nota de la línea. */
export interface PriceNote {
  producto_id: string;
  antes: number;
  ahora: number;
}

export interface RevalidateResult {
  lines: CartLine[];
  /** Solo en memoria: no se persisten. */
  notas: PriceNote[];
  /** Ids que ya no están en el catálogo vigente. */
  noDisponibles: string[];
}

/**
 * Revalida el carrito contra el catálogo vigente al abrir `/carrito` (AC-15):
 * un precio distinto se actualiza al vigente (con nota antes/ahora) y un id
 * inexistente queda marcado como no disponible, conservando su snapshot.
 */
export function revalidateCart(
  lines: readonly CartLine[],
  catalogo: CartCatalog,
): RevalidateResult {
  const notas: PriceNote[] = [];
  const noDisponibles: string[] = [];
  const out = lines.map((l): CartLine => {
    const vigente = catalogo[l.producto_id];
    if (!vigente) {
      noDisponibles.push(l.producto_id);
      return { ...l, no_disponible: true };
    }
    if (vigente.precio_venta !== l.precio_visto) {
      notas.push({ producto_id: l.producto_id, antes: l.precio_visto, ahora: vigente.precio_venta });
    }
    return {
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      precio_visto: vigente.precio_venta,
      nombre: vigente.nombre,
      presentacion: vigente.presentacion,
      imagen: vigente.imagen,
    };
  });
  return { lines: out, notas, noDisponibles };
}

/**
 * Aplica un 409 `rechazada_por_catalogo` del servidor al carrito: el precio
 * vigente que informa y las líneas no disponibles. El resto queda igual.
 */
export function applyRechazoCatalogo(
  lines: readonly CartLine[],
  rechazo: Extract<CrearOrdenResponse, { resultado: "rechazada_por_catalogo" }>,
): RevalidateResult {
  const porId = new Map(rechazo.lineas.map((r) => [r.producto_id, r]));
  const notas: PriceNote[] = [];
  const noDisponibles: string[] = [];
  const out = lines.map((l): CartLine => {
    const r = porId.get(l.producto_id);
    if (!r) return { ...l };
    if (r.estado === "no_disponible") {
      noDisponibles.push(l.producto_id);
      return { ...l, no_disponible: true };
    }
    notas.push({ producto_id: l.producto_id, antes: l.precio_visto, ahora: r.precio_vigente });
    return { ...l, precio_visto: r.precio_vigente };
  });
  return { lines: out, notas, noDisponibles };
}
