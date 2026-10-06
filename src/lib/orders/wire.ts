/**
 * Contrato HTTP con `renovarte-ordenes` (spec 0017) — copiado a mano de
 * `rfc-servicio-ordenes.md` §3, revisión 3 (2026-10-05), hasta que exista
 * `src/wire.ts` en `renovarte-ordenes` (B3). Cuando B3 cierre, el diff contra
 * ese archivo debe quedar vacío salvo este comentario de cabecera. Mismo
 * patrón que `src/lib/chat/types.ts`: sin paquete compartido entre repos.
 *
 * Los guards de runtime existen para que un body malformado nunca lance una
 * excepción en el cliente (AC-20: ante cualquier cosa rara, falla genérica).
 */

/** Máximo de líneas por orden en el servidor (Q-F1). Constante documental: el carrito no impone tope de líneas. */
export const MAX_LINEAS = 100;

// --- GET /v1/estado ---------------------------------------------------------

export type EstadoResponse =
  | { v: 1; resultado: "disponible"; form_token: string }
  | { v: 1; resultado: "tope_alcanzado" }
  | { v: 1; resultado: "no_disponible" };

// --- POST /v1/ordenes -------------------------------------------------------

export interface CrearOrdenRequest {
  v: 1;
  /** UUID v4 generado por el cliente (RFC §5.1). */
  idempotency_key: string;
  /** De GET /v1/estado. */
  form_token: string;
  /** 1..MAX_LINEAS líneas, `producto_id` sin repetir. */
  lineas: Array<{
    producto_id: string;
    /** Entero 1..20. */
    cantidad: number;
    /** Entero ARS: el `precio_venta` que el visitante tenía en pantalla. */
    precio_visto: number;
  }>;
  /** Entero ARS = Σ precio_visto × cantidad, lo que el visitante vio. */
  total_visto: number;
  /** Único dato personal que se pide (enmienda 2026-10-05). */
  contacto: { telefono: string };
  /** Honeypot: debe venir ausente o vacío. */
  sitio_web?: "";
}

export type CampoOrden =
  | "contacto.telefono"
  | "lineas"
  | "total_visto"
  | "form_token";

export type CodigoInvalida =
  | "requerido"
  | "formato"
  | "largo"
  | "token_vencido"
  | "no_permitido";

export type CodigoFalla =
  | "limite_frecuencia"
  | "envio_fallido"
  | "catalogo_no_disponible"
  | "en_proceso"
  | "estado_incierto"
  | "origen"
  | "mantenimiento"
  | "interno";

export type LineaRechazada =
  | { producto_id: string; estado: "precio_cambiado"; precio_vigente: number }
  | { producto_id: string; estado: "no_disponible" };

export type CrearOrdenResponse =
  | { v: 1; resultado: "aceptada"; numero_orden: string; recibida_en: string }
  | {
      v: 1;
      resultado: "rechazada_por_catalogo";
      lineas: LineaRechazada[];
      total_vigente: number;
    }
  | {
      v: 1;
      resultado: "invalida";
      errores: Array<{ campo: CampoOrden | null; codigo: CodigoInvalida }>;
    }
  | { v: 1; resultado: "tope_alcanzado" }
  | { v: 1; resultado: "falla"; codigo: CodigoFalla };

// --- guards -----------------------------------------------------------------

const CAMPOS: readonly string[] = [
  "contacto.telefono",
  "lineas",
  "total_visto",
  "form_token",
];
const CODIGOS_INVALIDA: readonly string[] = [
  "requerido",
  "formato",
  "largo",
  "token_vencido",
  "no_permitido",
];
const CODIGOS_FALLA: readonly string[] = [
  "limite_frecuencia",
  "envio_fallido",
  "catalogo_no_disponible",
  "en_proceso",
  "estado_incierto",
  "origen",
  "mantenimiento",
  "interno",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v);
}

function isLineaRechazada(v: unknown): v is LineaRechazada {
  if (!isRecord(v) || !isNonEmptyString(v.producto_id)) return false;
  if (v.estado === "no_disponible") return true;
  return v.estado === "precio_cambiado" && isInt(v.precio_vigente);
}

export function isEstadoResponse(v: unknown): v is EstadoResponse {
  if (!isRecord(v) || v.v !== 1) return false;
  switch (v.resultado) {
    case "disponible":
      return isNonEmptyString(v.form_token);
    case "tope_alcanzado":
    case "no_disponible":
      return true;
    default:
      return false;
  }
}

export function isCrearOrdenResponse(v: unknown): v is CrearOrdenResponse {
  if (!isRecord(v) || v.v !== 1) return false;
  switch (v.resultado) {
    case "aceptada":
      return isNonEmptyString(v.numero_orden) && isNonEmptyString(v.recibida_en);
    case "rechazada_por_catalogo":
      return (
        Array.isArray(v.lineas) &&
        v.lineas.every(isLineaRechazada) &&
        isInt(v.total_vigente)
      );
    case "invalida":
      return (
        Array.isArray(v.errores) &&
        v.errores.every(
          (e) =>
            isRecord(e) &&
            (e.campo === null ||
              (typeof e.campo === "string" && CAMPOS.includes(e.campo))) &&
            typeof e.codigo === "string" &&
            CODIGOS_INVALIDA.includes(e.codigo),
        )
      );
    case "tope_alcanzado":
      return true;
    case "falla":
      return typeof v.codigo === "string" && CODIGOS_FALLA.includes(v.codigo);
    default:
      return false;
  }
}
