/**
 * Cliente HTTP de `renovarte-ordenes` (spec 0017, RFC §3, plan.md decisión 5).
 *
 * Puro y con puertos inyectados: `fetch`, `now`, `schedule` y `cancel`. Los
 * defaults son wrappers flecha, nunca la referencia suelta a `setTimeout`:
 * guardada como campo y llamada como método, el navegador lanza "Illegal
 * invocation" (el bug de `src/lib/chat/transport.ts`).
 *
 * Todo lo que no sea una respuesta del contrato —body que no parsea,
 * `resultado` desconocido, 5xx sin body, red, timeout, URL sin configurar—
 * normaliza a `falla`. Solo `resultado === "aceptada"` con un 200/201 y un
 * `numero_orden` no vacío puede llevar a la confirmación (AC-20).
 */

import {
  isCrearOrdenResponse,
  isEstadoResponse,
  type CrearOrdenRequest,
  type CrearOrdenResponse,
} from "@/lib/orders/wire";
import { isDisponible, total, type CartLine } from "@/lib/cart/model";
import { normalizeNombre, normalizeTelefono } from "@/lib/orders/validate-contact";

/** Timeout de cada request (ux.md / RFC §3.2: un timeout es una falla, nunca éxito). */
export const TIMEOUT_MS = 15_000;

type TimeoutHandle = ReturnType<typeof setTimeout>;

export interface OrdersClientPorts {
  fetch: (input: string, init: RequestInit) => Promise<Response>;
  now: () => number;
  schedule: (fn: () => void, ms: number) => TimeoutHandle;
  cancel: (handle: TimeoutHandle) => void;
  /** Base de la Function URL (`NEXT_PUBLIC_ORDERS_API_URL`); sin configurar → `falla`. */
  baseUrl: string | undefined;
}

/** Defaults de producción. Wrappers flecha: ver el comentario del módulo. */
export function defaultPorts(): OrdersClientPorts {
  return {
    fetch: (input, init) => globalThis.fetch(input, init),
    now: () => Date.now(),
    schedule: (fn, ms) => globalThis.setTimeout(fn, ms),
    cancel: (handle) => globalThis.clearTimeout(handle),
    // Literal: Next solo inyecta `NEXT_PUBLIC_*` si se lee tal cual.
    baseUrl: process.env.NEXT_PUBLIC_ORDERS_API_URL,
  };
}

// --- resultados ---------------------------------------------------------------

export type EstadoOutcome =
  /** `emitidoEn`: `now()` al recibir el token (cota conservadora de su edad para el cliente). */
  | { kind: "disponible"; form_token: string; emitidoEn: number }
  | { kind: "tope_alcanzado" }
  /** Corte manual o por flood: NO es tope; el llamador lo trata como "sin cambios"/falla genérica. */
  | { kind: "no_disponible" }
  | { kind: "falla" };

export type OrderOutcome =
  | { kind: "aceptada"; numero_orden: string; recibida_en: string }
  | {
      kind: "rechazada_por_catalogo";
      lineas: Extract<CrearOrdenResponse, { resultado: "rechazada_por_catalogo" }>["lineas"];
      total_vigente: number;
    }
  | {
      kind: "invalida";
      errores: Extract<CrearOrdenResponse, { resultado: "invalida" }>["errores"];
    }
  | { kind: "tope_alcanzado" }
  | { kind: "falla" };

const FALLA: { kind: "falla" } = { kind: "falla" };

// --- request ------------------------------------------------------------------

export interface BuildRequestInput {
  idempotency_key: string;
  form_token: string;
  /** Líneas del carrito; se mandan solo las disponibles. */
  lines: readonly CartLine[];
  nombre: string;
  telefono: string;
  /** Valor del honeypot `sitio_web`; ausente o vacío para una persona. */
  honeypot?: string;
}

/**
 * Builder tipado del body (AC-17): arma cada clave a mano, nunca con spread,
 * así que no puede colarse `nombre`/`presentacion` de producto ni nada fuera de
 * `CrearOrdenRequest`. El nombre y el teléfono viajan normalizados (los mismos
 * valores que entran en la huella de `checkout`).
 */
export function buildCrearOrdenRequest(input: BuildRequestInput): CrearOrdenRequest {
  const disponibles = input.lines.filter(isDisponible);
  const request: CrearOrdenRequest = {
    v: 1,
    idempotency_key: input.idempotency_key,
    form_token: input.form_token,
    lineas: disponibles.map((l) => ({
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      precio_visto: l.precio_visto,
    })),
    total_visto: total(disponibles),
    contacto: {
      nombre: normalizeNombre(input.nombre),
      telefono: normalizeTelefono(input.telefono),
    },
  };
  // Se manda tal cual si un bot lo completó; el servidor lo rechaza (RFC §6.2).
  if (input.honeypot) request.sitio_web = input.honeypot as "";
  return request;
}

// --- transporte ---------------------------------------------------------------

interface Respuesta {
  status: number;
  body: unknown;
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}

/** Una request con timeout. `null` ante red, timeout o URL sin configurar. */
async function request(
  ports: OrdersClientPorts,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<Respuesta | null> {
  if (!ports.baseUrl) return null;
  const controller = new AbortController();
  const timer = ports.schedule(() => controller.abort(), TIMEOUT_MS);
  try {
    const init: RequestInit = {
      method,
      signal: controller.signal,
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    };
    const res = await ports.fetch(joinUrl(ports.baseUrl, path), init);
    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
    return { status: res.status, body: parsed };
  } catch {
    return null;
  } finally {
    ports.cancel(timer);
  }
}

/** `GET /v1/estado` (RFC §3.1). */
export async function fetchEstado(ports: OrdersClientPorts): Promise<EstadoOutcome> {
  const res = await request(ports, "GET", "/v1/estado");
  if (!res || !isEstadoResponse(res.body)) return FALLA;
  switch (res.body.resultado) {
    case "disponible":
      return { kind: "disponible", form_token: res.body.form_token, emitidoEn: ports.now() };
    case "tope_alcanzado":
      return { kind: "tope_alcanzado" };
    case "no_disponible":
      return { kind: "no_disponible" };
  }
}

/** `POST /v1/ordenes` (RFC §3.2), normalizado a un `OrderOutcome`. */
export async function crearOrden(
  ports: OrdersClientPorts,
  body: CrearOrdenRequest,
): Promise<OrderOutcome> {
  const res = await request(ports, "POST", "/v1/ordenes", body);
  if (!res || !isCrearOrdenResponse(res.body)) return FALLA;
  const r = res.body;
  switch (r.resultado) {
    case "aceptada":
      // Solo un 200/201 es una orden aceptada: cualquier otro status es sospechoso.
      return res.status === 200 || res.status === 201
        ? { kind: "aceptada", numero_orden: r.numero_orden, recibida_en: r.recibida_en }
        : FALLA;
    case "rechazada_por_catalogo":
      return { kind: "rechazada_por_catalogo", lineas: r.lineas, total_vigente: r.total_vigente };
    case "invalida":
      return { kind: "invalida", errores: r.errores };
    case "tope_alcanzado":
      return { kind: "tope_alcanzado" };
    case "falla":
      return FALLA;
  }
}
