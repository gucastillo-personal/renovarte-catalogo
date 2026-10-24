import { formatARS } from "@/lib/format";
import { INSTAGRAM_USER, RENOVARTE_EMAIL, RENOVARTE_TELEFONO } from "@/lib/contact";
import { MAX_POR_LINEA } from "@/lib/cart/model";

/**
 * Copy del carrito que comparten varias pantallas (ux.md, enmienda
 * 2026-10-08). Una sola fuente, para que la ficha, el carrito y el combo no
 * se desfasen.
 */

/** Nota del máximo por línea (ux.md #D): ficha, `/carrito` y combo la comparten. */
export const NOTA_MAXIMO = `Máximo ${MAX_POR_LINEA} unidades por producto. Si necesitás más, contalo cuando RenovArte te contacte.`;

/** "1 producto" / "N productos". */
export function productosLabel(n: number): string {
  return `${n} ${n === 1 ? "producto" : "productos"}`;
}

/** Anuncio al agregar desde la ficha (ux.md "Agregar desde la ficha", punto 3). */
export function anuncioAgregado(nombre: string, enCarrito: number): string {
  return `Agregaste ${nombre} al carrito. En tu carrito: ${enCarrito}.`;
}

/** Anuncio del toque que no suma, con la línea ya en el máximo (Q-F2c). */
export function anuncioYaEnMaximo(nombre: string): string {
  return `${nombre} ya está en el máximo de ${MAX_POR_LINEA} unidades. No se agregó otra.`;
}

/** Anuncio al cambiar la cantidad en el carrito (ux.md "Editar el carrito"). */
export function anuncioCantidad(nombre: string, cantidad: number, total: number): string {
  const unidades = `${cantidad} ${cantidad === 1 ? "unidad" : "unidades"}`;
  const maximo = cantidad >= MAX_POR_LINEA ? " Es el máximo por producto." : "";
  return `${nombre}: ${unidades}. Total ${formatARS(total)}.${maximo}`;
}

export function anuncioQuitado(nombre: string, total: number): string {
  return `Quitaste ${nombre} del carrito. Total ${formatARS(total)}.`;
}

export const ANUNCIO_VACIADO = "Vaciaste el carrito.";

const CANALES = `llamando al ${RENOVARTE_TELEFONO}, escribiendo a ${RENOVARTE_EMAIL} o por mensaje directo en Instagram a @${INSTAGRAM_USER}.`;

/** `<noscript>` de la ficha (ux.md "Progresividad / JS"). */
export const NOSCRIPT_FICHA = `Para usar el carrito necesitás JavaScript habilitado. También podés pedir este producto ${CANALES}`;

/** `<noscript>` de `/carrito` (ux.md "Progresividad / JS"). */
export const NOSCRIPT_CARRITO = `Para ver tu carrito y enviar una orden necesitás JavaScript habilitado en tu navegador. También podés hacer tu pedido ${CANALES}`;

/** Título del aviso de revalidación (ux.md "Revalidación contra el catálogo vigente"). */
export const AVISO_REVALIDACION = "Actualizamos tu carrito con el catálogo vigente.";

/** Ítems del aviso de revalidación: solo los que aplican, en singular o plural. */
export function itemsAvisoRevalidacion(precios: number, noDisponibles: number): string[] {
  const items: string[] = [];
  if (precios === 1) items.push("1 precio cambió desde que lo agregaste.");
  else if (precios > 1) items.push(`${precios} precios cambiaron desde que los agregaste.`);
  if (noDisponibles === 1) {
    items.push("1 producto ya no está en el catálogo y no se va a incluir en la orden.");
  } else if (noDisponibles > 1) {
    items.push(
      `${noDisponibles} productos ya no están en el catálogo y no se van a incluir en la orden.`,
    );
  }
  return items;
}

/** En lugar del formulario cuando todas las líneas son no disponibles (ux.md "Carrito vacío"). */
export const SIN_DISPONIBLES =
  "No hay productos disponibles para generar una orden. Quitá los que ya no están y agregá otros desde el catálogo.";

/** Anuncio al empezar el envío (ux.md "Enviar la orden", punto 2). */
export const ANUNCIO_ENVIANDO = "Enviando tu orden…";

/** Aviso tras un 409 `rechazada_por_catalogo` (ux.md "Precio o producto cambiado al enviar"). */
export const AVISO_PRECIOS_ACTUALIZADOS =
  "Los precios se actualizaron mientras completabas tus datos. Revisá el total y volvé a enviar la orden.";
