/**
 * Modelo puro del carrito (spec 0017, F3). Sin React ni storage: todas las
 * operaciones reciben y devuelven arrays nuevos, así el store y los tests las
 * usan igual.
 */

/** Tope de unidades por línea (ux.md #D, igual que `cantidad` 1..20 del contrato). */
export const MAX_POR_LINEA = 20;

/**
 * Una línea del carrito. Es **todo** lo que se persiste (AC-18): nunca datos
 * de contacto. `nombre`/`presentacion`/`imagen` son un snapshot, para que una
 * línea "ya no está en el catálogo" siga mostrando su nombre.
 */
export interface CartLine {
  producto_id: string;
  /** Entero 1..MAX_POR_LINEA. */
  cantidad: number;
  /** Entero ARS: el `precio_venta` que el visitante vio. */
  precio_visto: number;
  nombre: string;
  presentacion: string;
  imagen: string;
  /** `true` si el producto ya no existe en el catálogo vigente (AC-15). */
  no_disponible?: true;
}

/** Lo mínimo de un producto para agregarlo (card, ficha o combo de Colibrí). */
export interface CartProductInput {
  id: string;
  nombre: string;
  presentacion: string;
  imagen: string;
  precio_venta: number;
}

export interface AddResult {
  lines: CartLine[];
  /** Alguna línea tocó `MAX_POR_LINEA` y no pudo sumar la unidad pedida. */
  topeado: boolean;
}

export interface RemoveResult {
  lines: CartLine[];
  /** Lo quitado y su posición, para `restoreLine`; `null` si el id no estaba. */
  removed: { line: CartLine; index: number } | null;
}

function addOne(lines: CartLine[], p: CartProductInput): boolean {
  const i = lines.findIndex((l) => l.producto_id === p.id);
  const prev = lines[i];
  if (prev === undefined) {
    lines.push({
      producto_id: p.id,
      cantidad: 1,
      precio_visto: p.precio_venta,
      nombre: p.nombre,
      presentacion: p.presentacion,
      imagen: p.imagen,
    });
    return false;
  }
  const topeado = prev.cantidad >= MAX_POR_LINEA;
  // Agregar desde el catálogo refresca el precio: es lo que el visitante ve ahora.
  const { no_disponible: _omit, ...rest } = prev;
  void _omit;
  lines[i] = {
    ...rest,
    cantidad: Math.min(prev.cantidad + 1, MAX_POR_LINEA),
    precio_visto: p.precio_venta,
    nombre: p.nombre,
    presentacion: p.presentacion,
    imagen: p.imagen,
  };
  return topeado;
}

/** Suma 1 unidad del producto (AC-4: sin duplicar la línea). */
export function addProduct(lines: readonly CartLine[], p: CartProductInput): AddResult {
  return addCombo(lines, [p]);
}

/** Suma 1 unidad de cada producto del combo (AC-6). */
export function addCombo(
  lines: readonly CartLine[],
  productos: readonly CartProductInput[],
): AddResult {
  const next = lines.map((l) => ({ ...l }));
  let topeado = false;
  for (const p of productos) {
    if (addOne(next, p)) topeado = true;
  }
  return { lines: next, topeado };
}

/** Fija la cantidad, acotada a 1..MAX_POR_LINEA. Un id inexistente no cambia nada. */
export function setCantidad(
  lines: readonly CartLine[],
  productoId: string,
  cantidad: number,
): CartLine[] {
  const c = Math.min(Math.max(Math.trunc(cantidad) || 1, 1), MAX_POR_LINEA);
  return lines.map((l) => (l.producto_id === productoId ? { ...l, cantidad: c } : { ...l }));
}

export function removeLine(lines: readonly CartLine[], productoId: string): RemoveResult {
  const index = lines.findIndex((l) => l.producto_id === productoId);
  const found = lines[index];
  if (found === undefined) return { lines: lines.map((l) => ({ ...l })), removed: null };
  return {
    lines: lines.filter((_, i) => i !== index).map((l) => ({ ...l })),
    removed: { line: { ...found }, index },
  };
}

/** Deshace `removeLine`: reinserta la línea en la misma posición. */
export function restoreLine(
  lines: readonly CartLine[],
  line: CartLine,
  index: number,
): CartLine[] {
  if (lines.some((l) => l.producto_id === line.producto_id)) return lines.map((l) => ({ ...l }));
  const next = lines.map((l) => ({ ...l }));
  next.splice(Math.min(Math.max(index, 0), next.length), 0, { ...line });
  return next;
}

export function clear(): CartLine[] {
  return [];
}

export function isDisponible(line: CartLine): boolean {
  return line.no_disponible !== true;
}

export function subtotal(line: CartLine): number {
  return line.precio_visto * line.cantidad;
}

/** Unidades del contador del header: no cuenta las líneas no disponibles. */
export function unidadesDisponibles(lines: readonly CartLine[]): number {
  return lines.filter(isDisponible).reduce((n, l) => n + l.cantidad, 0);
}

/** Total del carrito: suma de subtotales de las líneas disponibles. */
export function total(lines: readonly CartLine[]): number {
  return lines.filter(isDisponible).reduce((n, l) => n + subtotal(l), 0);
}

// --- persistencia -----------------------------------------------------------

const STORED_VERSION = 1;

function parseLine(v: unknown): CartLine | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  if (
    typeof r.producto_id !== "string" ||
    r.producto_id === "" ||
    typeof r.cantidad !== "number" ||
    !Number.isInteger(r.cantidad) ||
    r.cantidad < 1 ||
    r.cantidad > MAX_POR_LINEA ||
    typeof r.precio_visto !== "number" ||
    !Number.isInteger(r.precio_visto) ||
    r.precio_visto < 0 ||
    typeof r.nombre !== "string" ||
    typeof r.presentacion !== "string" ||
    typeof r.imagen !== "string"
  ) {
    return null;
  }
  const line: CartLine = {
    producto_id: r.producto_id,
    cantidad: r.cantidad,
    precio_visto: r.precio_visto,
    nombre: r.nombre,
    presentacion: r.presentacion,
    imagen: r.imagen,
  };
  if (r.no_disponible === true) line.no_disponible = true;
  return line;
}

/** Lee lo guardado. JSON corrupto, de otra versión o sin forma → carrito vacío. */
export function parseStored(raw: string | null): CartLine[] {
  if (raw === null) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (typeof data !== "object" || data === null) return [];
  const d = data as Record<string, unknown>;
  if (d.v !== STORED_VERSION || !Array.isArray(d.lines)) return [];
  const seen = new Set<string>();
  const out: CartLine[] = [];
  for (const item of d.lines) {
    const line = parseLine(item);
    if (line && !seen.has(line.producto_id)) {
      seen.add(line.producto_id);
      out.push(line);
    }
  }
  return out;
}

/** Serializa por allowlist: solo las claves de `CartLine`, nunca un spread (AC-18). */
export function serialize(lines: readonly CartLine[]): string {
  return JSON.stringify({
    v: STORED_VERSION,
    lines: lines.map((l) => ({
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      precio_visto: l.precio_visto,
      nombre: l.nombre,
      presentacion: l.presentacion,
      imagen: l.imagen,
      ...(l.no_disponible ? { no_disponible: true } : {}),
    })),
  });
}
