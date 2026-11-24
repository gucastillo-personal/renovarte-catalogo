/**
 * Confirmación de la orden en `sessionStorage` (spec 0017, F15; AC-28, plan.md
 * decisión 9, Q-F5 aprobada).
 *
 * Sirve para que la pantalla de confirmación sobreviva a una recarga de la
 * pestaña. Se escribe **solo** después de `aceptada` y se proyecta por
 * allowlist `{ numero_orden, lineas, total, nombre, telefono }`: nunca con
 * spread, y ningún otro dato de contacto (`email`, `direccion`, `localidad`)
 * aunque el objeto que llegue lo traiga. Ante JSON corrupto o sin forma,
 * devuelve "nada". Un error de storage se ignora.
 */

import { clearDraft, type DraftStorage } from "@/lib/orders/contact-draft";
import { ENVIO_EN_CURSO_KEY } from "@/lib/orders/checkout";

export const CONFIRMATION_KEY = "renovarte:orden-confirmada:v1";

export interface ConfirmationLine {
  nombre: string;
  presentacion: string;
  cantidad: number;
  /** Precio unitario visto. */
  precio: number;
}

export interface Confirmation {
  numero_orden: string;
  lineas: ConfirmationLine[];
  total: number;
  /** Normalizado: el mismo valor que viajó en el body. */
  nombre: string;
  telefono: string;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Proyecta por allowlist o devuelve `null` si no tiene la forma. */
function project(raw: unknown): Confirmation | null {
  if (!isObj(raw)) return null;
  const { numero_orden, lineas, total, nombre, telefono } = raw;
  if (typeof numero_orden !== "string" || numero_orden === "") return null;
  if (typeof total !== "number" || !Number.isFinite(total)) return null;
  if (typeof nombre !== "string" || typeof telefono !== "string") return null;
  if (!Array.isArray(lineas)) return null;
  const out: ConfirmationLine[] = [];
  for (const l of lineas) {
    if (!isObj(l)) return null;
    if (
      typeof l.nombre !== "string" ||
      typeof l.presentacion !== "string" ||
      typeof l.cantidad !== "number" ||
      typeof l.precio !== "number"
    ) {
      return null;
    }
    out.push({ nombre: l.nombre, presentacion: l.presentacion, cantidad: l.cantidad, precio: l.precio });
  }
  return { numero_orden, lineas: out, total, nombre, telefono };
}

export function writeConfirmation(storage: DraftStorage | null, c: Confirmation): void {
  if (!storage) return;
  const safe = project(c);
  if (!safe) return;
  try {
    storage.setItem(CONFIRMATION_KEY, JSON.stringify(safe));
  } catch {
    // Sin espacio o bloqueado: la confirmación se ve igual, solo no sobrevive a una recarga.
  }
}

export function readConfirmation(storage: DraftStorage | null): Confirmation | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CONFIRMATION_KEY);
    if (raw === null) return null;
    return project(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearConfirmation(storage: DraftStorage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(CONFIRMATION_KEY);
  } catch {
    // Ídem.
  }
}

/**
 * Todo lo que el flujo de la orden deja en `sessionStorage`: confirmación,
 * borrador del formulario y key del envío en curso. Se llama cuando la ruta
 * deja de ser `/carrito` (plan.md decisión 9).
 */
export function clearOrderSession(storage: DraftStorage | null): void {
  clearConfirmation(storage);
  clearDraft(storage);
  if (!storage) return;
  try {
    storage.removeItem(ENVIO_EN_CURSO_KEY);
  } catch {
    // Ídem.
  }
}
