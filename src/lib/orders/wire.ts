/**
 * Contrato HTTP con `renovarte-ordenes` (spec 0017, RFC rev. 4 §3, ADR-0020).
 * Los tipos son copia de `renovarte-ordenes/src/wire.ts` (B3): el diff contra
 * ese archivo debe quedar vacío salvo este comentario de cabecera y el bloque
 * "guards" del final. Mismo patrón que `src/lib/chat/types.ts`: sin paquete
 * compartido entre repos.
 *
 * Los guards de runtime existen para que un body malformado nunca lance una
 * excepción en el cliente (AC-20: ante cualquier cosa rara, falla genérica).
 */

/** Máximo de líneas por orden en el servidor (Q-F1). Constante documental: el carrito no impone tope de líneas. */
export const MAX_LINEAS = 100;

// ---------------------------------------------------------------------------
// GET /v1/estado — disponibilidad + token de formulario (§3.1)
// ---------------------------------------------------------------------------

/** 200 */
export type EstadoResponse =
  | { v: 1; resultado: "disponible"; form_token: string }
  | { v: 1; resultado: "tope_alcanzado" }
  // corte manual o por flood → el cliente lo trata como falla genérica
  | { v: 1; resultado: "no_disponible" };

// ---------------------------------------------------------------------------
// POST /v1/ordenes — crear la orden (§3.2)
// ---------------------------------------------------------------------------

/**
 * `Content-Type: application/json`, body de 16 KB como máximo.
 * Esquema estricto: cualquier clave no listada hace que la orden se rechace
 * como `invalida`/`no_permitido` (AC-17), incluido cualquier intento de
 * `to`, `cc`, `bcc`, `destinatario`, `reply_to`, `webhook`, `canal`, y las
 * claves retiradas `email`, `direccion` y `localidad`.
 */
export interface CrearOrdenRequest {
  v: 1;
  /** UUID v4 generado por el cliente (reglas en RFC §5.1). */
  idempotency_key: string;
  /** De GET /v1/estado (RFC §6.2). */
  form_token: string;
  /** 1..100 líneas (Q-F1), `producto_id` sin repetir. */
  lineas: Array<{
    /** `id` de products.json. */
    producto_id: string;
    /** Entero 1..20 (ux.md #D). */
    cantidad: number;
    /** Entero ARS: el `precio_venta` que el visitante tenía en pantalla. */
    precio_visto: number;
  }>;
  /** Entero ARS = Σ precio_visto × cantidad, lo que el visitante vio. */
  total_visto: number;
  /**
   * Únicos datos personales (ADR-0020, Ley 25.326): solo en memoria, nunca
   * a DynamoDB, logs, métricas, errores ni respuestas.
   */
  contacto: {
    /**
     * "Nombre y apellido", un solo campo; obligatorio. Tras recortar y
     * normalizar (NFC, colapso de espacios): 2..80 caracteres y ≥ 1 letra
     * (AC-9, RFC §3.2.1).
     */
    nombre: string;
    /** Obligatorio; 8..15 dígitos tras quitar espacios, - ( ) + (AC-9). */
    telefono: string;
  };
  /** Honeypot: debe venir ausente o vacío (RFC §6.2). */
  sitio_web?: "";
}

export type CampoOrden =
  | "contacto.nombre"
  | "contacto.telefono"
  | "lineas"
  | "total_visto"
  | "form_token";

export type CodigoError =
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

export type CrearOrdenResponse =
  // 201 (primera vez) o 200 (reintento idempotente de la misma orden).
  // Significa: al menos un canal de entrega confirmó la orden (RFC §5.3).
  | {
      v: 1;
      resultado: "aceptada";
      numero_orden: string;
      /** ISO-8601 UTC. */
      recibida_en: string;
    }
  // 409: no se entregó nada por ningún canal. El cliente actualiza las
  // líneas y pide reenviar.
  | {
      v: 1;
      resultado: "rechazada_por_catalogo";
      /** Solo las líneas con problema. */
      lineas: Array<
        | { producto_id: string; estado: "precio_cambiado"; precio_vigente: number }
        | { producto_id: string; estado: "no_disponible" }
      >;
      /** Σ precio_vigente × cantidad sobre las líneas disponibles. */
      total_vigente: number;
    }
  // 422: datos que el servidor rechaza (AC-9, defensa en profundidad).
  // errores: [] → el cliente muestra el error general arriba del formulario.
  // token_vencido = token fuera de su ventana de validez (vencido o de < 3 s,
  // RFC §6.2). Los errores llevan solo `campo` y `codigo`, jamás el valor.
  | {
      v: 1;
      resultado: "invalida";
      errores: Array<{ campo: CampoOrden | null; codigo: CodigoError }>;
    }
  // 503: tope mensual (AC-22). Sin "Reintentar" en la UI.
  | { v: 1; resultado: "tope_alcanzado" }
  // 429 / 403 / 500 / 502 / 503: falla genérica reintentable (AC-20).
  | { v: 1; resultado: "falla"; codigo: CodigoFalla };

// --- guards -----------------------------------------------------------------

const CAMPOS: readonly string[] = [
  "contacto.nombre",
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

type LineaRechazada = Extract<
  CrearOrdenResponse,
  { resultado: "rechazada_por_catalogo" }
>["lineas"][number];

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
