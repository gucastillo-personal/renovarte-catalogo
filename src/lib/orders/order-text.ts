/**
 * Texto plano de "Copiar detalle del pedido" (ux.md "Orden no enviada — falla
 * o servicio caído"): productos y total. **Nunca** el nombre ni el teléfono del
 * visitante (AC-28): el texto copiado no lleva datos personales al portapapeles.
 * Solo recibe líneas, así que ni siquiera tiene por dónde colarlos.
 */

import { isDisponible, subtotal, total, type CartLine } from "@/lib/cart/model";
import { formatARS } from "@/lib/format";

export function orderText(lines: readonly CartLine[]): string {
  const disponibles = lines.filter(isDisponible);
  const items = disponibles.map((l) => {
    const presentacion = l.presentacion !== "" ? ` (${l.presentacion})` : "";
    return `- ${l.nombre}${presentacion} x${l.cantidad}: ${formatARS(subtotal(l))}`;
  });
  return ["Pedido RenovArte", ...items, `Total: ${formatARS(total(disponibles))}`].join("\n");
}
