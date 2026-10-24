/**
 * Borrador del formulario en `sessionStorage` (spec 0017, AC-28, ADR-0020,
 * ux.md "Qué se guarda en el navegador").
 *
 * Solo `{ nombre, telefono }`, solo en la pestaña (nunca `localStorage`), al
 * salir de cada campo y al enviar (no por tecla). Se proyecta por allowlist de
 * dos claves, nunca con spread. Ante JSON corrupto o sin forma, devuelve
 * "nada". Cualquier error de storage se ignora: el formulario sigue andando.
 */

export const CONTACT_DRAFT_KEY = "renovarte:contacto-borrador:v1";

export interface ContactDraft {
  nombre: string;
  telefono: string;
}

export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readDraft(storage: DraftStorage | null): ContactDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CONTACT_DRAFT_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const r = parsed as Record<string, unknown>;
    if (typeof r.nombre !== "string" || typeof r.telefono !== "string") return null;
    return { nombre: r.nombre, telefono: r.telefono };
  } catch {
    return null;
  }
}

/** Guarda solo las dos claves de la allowlist, aunque llegue un objeto con más. */
export function writeDraft(storage: DraftStorage | null, draft: ContactDraft): void {
  if (!storage) return;
  try {
    const { nombre, telefono } = draft;
    if (nombre === "" && telefono === "") {
      storage.removeItem(CONTACT_DRAFT_KEY);
      return;
    }
    storage.setItem(CONTACT_DRAFT_KEY, JSON.stringify({ nombre, telefono }));
  } catch {
    // Sin espacio o bloqueado: se pierde el borrador, nada más.
  }
}

export function clearDraft(storage: DraftStorage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(CONTACT_DRAFT_KEY);
  } catch {
    // Ídem.
  }
}

/** `sessionStorage` o `null` (servidor, modo privado, bloqueado). */
export function browserSessionStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
