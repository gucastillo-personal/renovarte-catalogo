/**
 * Máquina de envío de la orden (spec 0017, F11; plan.md decisiones 6 y 7;
 * RFC §5.1 y §6.2). Sin React ni DOM: se prueba con puertos falsos.
 *
 * - `checkoutReducer`: transiciones puras del estado del envío.
 * - `createCheckout`: el controlador con los efectos —ciclo del `form_token`,
 *   reglas de la `idempotency_key`, guard síncrono de doble envío (AC-24) y
 *   `sessionStorage` del envío en curso (decisión de la gate 2026-10-01)—.
 *
 * El nombre y el teléfono pasan por acá en memoria solo para armar el body y
 * la huella; la huella que se guarda en `sessionStorage` es un hash, nunca los
 * datos en claro (AC-28).
 */

import { isDisponible, total, type CartLine } from "@/lib/cart/model";
import {
  buildCrearOrdenRequest,
  crearOrden,
  fetchEstado,
  type OrderOutcome,
  type OrdersClientPorts,
} from "@/lib/orders/client";
import {
  mapServerErrors,
  normalizeNombre,
  normalizeTelefono,
  type ErrorContacto,
} from "@/lib/orders/validate-contact";

/** Espera mínima desde la emisión del token: la ventana del servidor empieza a los 3 s (RFC §6.2, Q-F4). */
export const TOKEN_ESPERA_MIN_MS = 3500;
/** Se renueva si tiene más de 1 h 50 min: el servidor lo acepta hasta las 2 h. */
export const TOKEN_RENOVAR_MS = 110 * 60 * 1000;
/** `sessionStorage`: `{ idempotency_key, huella }` del envío en curso (AC-24). */
export const ENVIO_EN_CURSO_KEY = "renovarte:envio-en-curso:v1";

// --- estado -----------------------------------------------------------------

type RechazoCatalogo = Extract<OrderOutcome, { kind: "rechazada_por_catalogo" }>;

export type CheckoutState =
  | { status: "editando" }
  | { status: "enviando" }
  | { status: "confirmada"; numero_orden: string; recibida_en: string }
  | { status: "fallida" }
  | { status: "tope" }
  | { status: "rechazada_por_catalogo"; lineas: RechazoCatalogo["lineas"]; total_vigente: number }
  /** `general`: sin campo mapeable → error general arriba del formulario (Q-F2a). */
  | { status: "invalida"; errores: ErrorContacto[]; general: boolean };

/** Cómo terminó un ciclo de envío (lo que se aplica sobre `enviando`). */
export type Resolucion = Exclude<CheckoutState, { status: "editando" | "enviando" }>;

export type CheckoutAction =
  | { type: "SUBMIT" }
  | { type: "RESOLVE"; resolucion: Resolucion }
  /** El visitante tocó algo después de un resultado: vuelve a editar. */
  | { type: "EDIT" };

export const INITIAL_STATE: CheckoutState = { status: "editando" };

/**
 * Transiciones. Un `SUBMIT` (o un `EDIT`) durante `enviando` devuelve el mismo
 * estado, sin cambios. `RESOLVE` solo vale sobre `enviando`.
 */
export function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case "SUBMIT":
      return state.status === "enviando" ? state : { status: "enviando" };
    case "RESOLVE":
      return state.status === "enviando" ? action.resolucion : state;
    case "EDIT":
      return state.status === "enviando" || state.status === "editando" ? state : { status: "editando" };
  }
}

// --- huella ------------------------------------------------------------------

/** Hash no criptográfico de 53 bits (cyrb53): alcanza para distinguir dos payloads de la misma pestaña. */
function hash53(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

export interface PayloadInput {
  lines: readonly CartLine[];
  nombre: string;
  telefono: string;
}

/**
 * Huella del payload: líneas disponibles (id, cantidad, precio visto), total,
 * **nombre normalizado** y teléfono normalizado, que son exactamente los valores
 * que viajan en el body. Cualquier cambio de uno de ellos cambia la huella
 * ("Ana  Pérez" y "Ana Pérez" dan la misma). Devuelve un hash.
 */
export function huella(input: PayloadInput): string {
  const disponibles = input.lines.filter(isDisponible);
  return hash53(
    JSON.stringify([
      disponibles.map((l) => [l.producto_id, l.cantidad, l.precio_visto]),
      total(disponibles),
      normalizeNombre(input.nombre),
      normalizeTelefono(input.telefono),
    ]),
  );
}

// --- sessionStorage del envío en curso -----------------------------------------

export type EnvioStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

interface ClaveEnCurso {
  idempotency_key: string;
  huella: string;
}

function readEnCurso(storage: EnvioStorage | null): ClaveEnCurso | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(ENVIO_EN_CURSO_KEY);
    if (raw === null) return null;
    const r: unknown = JSON.parse(raw);
    if (typeof r !== "object" || r === null || Array.isArray(r)) return null;
    const o = r as Record<string, unknown>;
    if (typeof o.idempotency_key !== "string" || o.idempotency_key === "") return null;
    if (typeof o.huella !== "string" || o.huella === "") return null;
    return { idempotency_key: o.idempotency_key, huella: o.huella };
  } catch {
    return null;
  }
}

function writeEnCurso(storage: EnvioStorage | null, clave: ClaveEnCurso): void {
  if (!storage) return;
  try {
    // Allowlist de dos claves: nunca nombre ni teléfono.
    storage.setItem(
      ENVIO_EN_CURSO_KEY,
      JSON.stringify({ idempotency_key: clave.idempotency_key, huella: clave.huella }),
    );
  } catch {
    // Sin espacio o bloqueado: la key sigue en memoria.
  }
}

function clearEnCurso(storage: EnvioStorage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(ENVIO_EN_CURSO_KEY);
  } catch {
    // Ídem.
  }
}

// --- controlador ---------------------------------------------------------------

export interface CheckoutDeps {
  ports: OrdersClientPorts;
  /** `crypto.randomUUID()` inyectado. */
  randomUUID: () => string;
  /** `sessionStorage` o `null`. */
  storage: EnvioStorage | null;
}

export interface SubmitInput extends PayloadInput {
  /** Valor del honeypot `sitio_web`. */
  honeypot?: string;
}

export interface Checkout {
  getState(): CheckoutState;
  subscribe(listener: () => void): () => void;
  /**
   * Un envío. Si ya hay uno en curso devuelve `null` y no produce ningún
   * efecto (AC-24). Si no, resuelve con el estado final del ciclo.
   */
  submit(input: SubmitInput): Promise<CheckoutState | null>;
  /** Vuelve a `editando` después de un resultado. No hace nada durante `enviando`. */
  edit(): void;
  /** Guarda el `form_token` del `GET /v1/estado` hecho al montar `/carrito` (F14). */
  adoptToken(formToken: string, emitidoEn: number): void;
}

/** `token_vencido` cubre el token vencido y el de menos de 3 s (RFC §6.2). */
const hasTokenExpired = (errores: ReadonlyArray<{ codigo: string }>) =>
  errores.some((e) => e.codigo === "token_vencido");

export function createCheckout(deps: CheckoutDeps): Checkout {
  const { ports, randomUUID, storage } = deps;

  let state: CheckoutState = INITIAL_STATE;
  const listeners = new Set<() => void>();
  // Guard síncrono: se marca antes del primer `await`, no depende de un render.
  let inFlight = false;
  // La key vive en memoria; se recupera de `sessionStorage` si la pestaña se recargó durante el envío.
  let key: ClaveEnCurso | null = readEnCurso(storage);
  let token: { form_token: string; emitidoEn: number } | null = null;

  const dispatch = (action: CheckoutAction) => {
    const next = checkoutReducer(state, action);
    if (next === state) return;
    state = next;
    listeners.forEach((l) => l());
  };

  const sleep = (ms: number) => new Promise<void>((resolve) => ports.schedule(resolve, ms));

  /** Deja un token utilizable o devuelve la resolución con la que terminar. */
  async function ensureToken(): Promise<Resolucion | null> {
    if (!token || ports.now() - token.emitidoEn > TOKEN_RENOVAR_MS) {
      token = null;
      const estado = await fetchEstado(ports);
      if (estado.kind === "disponible") {
        token = { form_token: estado.form_token, emitidoEn: estado.emitidoEn };
      } else if (estado.kind === "tope_alcanzado") {
        return { status: "tope" };
      } else {
        // `no_disponible` (corte manual o flood), red o body raro: falla genérica.
        return { status: "fallida" };
      }
    }
    const falta = TOKEN_ESPERA_MIN_MS - (ports.now() - token.emitidoEn);
    if (falta > 0) await sleep(falta);
    return null;
  }

  async function run(input: SubmitInput, clave: ClaveEnCurso): Promise<Resolucion> {
    let reintentado = false;
    for (;;) {
      const sinToken = await ensureToken();
      if (sinToken) return sinToken;
      const request = buildCrearOrdenRequest({
        idempotency_key: clave.idempotency_key,
        form_token: token!.form_token,
        lines: input.lines,
        nombre: input.nombre,
        telefono: input.telefono,
        honeypot: input.honeypot,
      });
      const out = await crearOrden(ports, request);

      switch (out.kind) {
        case "aceptada":
          key = null;
          return { status: "confirmada", numero_orden: out.numero_orden, recibida_en: out.recibida_en };
        case "rechazada_por_catalogo":
          // Las líneas van a cambiar: la próxima key es nueva.
          key = null;
          return { status: "rechazada_por_catalogo", lineas: out.lineas, total_vigente: out.total_vigente };
        case "tope_alcanzado":
          return { status: "tope" };
        case "falla":
          return { status: "fallida" };
        case "invalida": {
          if (hasTokenExpired(out.errores)) {
            // Vencido o prematuro: token nuevo, espera mínima y UN reintento silencioso con la misma key.
            if (reintentado) return { status: "fallida" };
            reintentado = true;
            token = null;
            continue;
          }
          const errores = mapServerErrors(out.errores);
          if (errores.length > 0) return { status: "invalida", errores, general: false };
          // Sin campo mapeable: el siguiente envío, aun sin cambios, sale con key nueva (#L).
          key = null;
          return { status: "invalida", errores: [], general: true };
        }
      }
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async submit(input) {
      if (inFlight) return null;
      inFlight = true;
      dispatch({ type: "SUBMIT" });

      let resolucion: Resolucion;
      try {
        // Misma huella → misma key; cualquier cambio (nombre y teléfono incluidos) → key nueva.
        const h = huella(input);
        if (!key || key.huella !== h) key = { idempotency_key: randomUUID(), huella: h };
        writeEnCurso(storage, key);
        resolucion = await run(input, key);
      } catch {
        resolucion = { status: "fallida" };
      } finally {
        clearEnCurso(storage);
        inFlight = false;
      }
      dispatch({ type: "RESOLVE", resolucion });
      return state;
    },
    edit: () => dispatch({ type: "EDIT" }),
    adoptToken(formToken, emitidoEn) {
      token = { form_token: formToken, emitidoEn };
    },
  };
}
