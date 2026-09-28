/**
 * Wire contract of the "Colibrí" chat transport (spec 0016) — copied by hand,
 * verbatim, from `renovarte-chat-gateway/src/types.ts` (source of truth,
 * itself derived from `specs/0016-chat-recomendador-cremas/
 * rfc-transporte-websocket.md` §3). Same pattern `ai-agent` uses in
 * `renovarte-colibri-rag/src/types/wire.ts` — no shared npm package across
 * repos, on purpose (`plan.md` "## Frontend" > "Resumen de decisiones").
 *
 * Only the subset this repo actually needs: the envelope + the 7 payload
 * shapes the browser sends/receives. `ChatControlItem`/`ConnectionItem`/
 * `BudgetLedgerItem`/`ConnectorInvocationPayload` are transport/AI-repo
 * internals, never sent over the wire to the browser, so they're not copied
 * here.
 *
 * Every runtime guard below exists so a malformed frame from the transport
 * never throws an uncaught exception in the client — that would break AC-11
 * structurally (T1, `plan.md`).
 */

export type MessageType =
  | "user_message"
  | "text_delta"
  | "text_done"
  | "profile_confirmed"
  | "combo_recommendation"
  | "no_recommendation"
  | "unavailable";

export const MESSAGE_TYPES: readonly MessageType[] = [
  "user_message",
  "text_delta",
  "text_done",
  "profile_confirmed",
  "combo_recommendation",
  "no_recommendation",
  "unavailable",
];

export interface ChatEnvelope<T = unknown> {
  v: 1;
  type: MessageType;
  /** uuid v4, one per assistant turn; the client generates it for `user_message` and reuses it as correlation. */
  turn_id: string;
  /** ISO-8601 */
  ts: string;
  payload: T;
}

// --- 3.1 Client -> server ---------------------------------------------------

export interface UserMessagePayload {
  text: string;
}

// --- 3.2 Server -> client ----------------------------------------------------

export interface TextDeltaPayload {
  token: string;
}

export interface TextDonePayload {
  text: string;
}

export interface ProfileConfirmedPayload {
  tipo_piel?: string;
  presupuesto?: number;
}

export type ComboNivel = "mas_barato" | "medio" | "premium";

export interface ComboItem {
  producto_id: string;
  nombre: string;
  presentacion: string;
  precio_venta: number;
}

export interface ComboEntry {
  nivel: ComboNivel;
  items: ComboItem[];
  total: number;
}

export interface ComboRecommendationPayload {
  combos: [ComboEntry, ComboEntry, ComboEntry];
}

export interface NoRecommendationPayload {
  mensaje: string;
}

export interface UnavailablePayload {
  reason: string;
}

// ---------------------------------------------------------------------------
// Runtime guards — same style as `isProduct`/`validateProducts` in
// `src/lib/types.ts`: a malformed message degrades to a local
// `unavailable`/`internal_error` (see `transport.ts`), never an exception.
// ---------------------------------------------------------------------------

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isMessageType(x: unknown): x is MessageType {
  return typeof x === "string" && (MESSAGE_TYPES as readonly string[]).includes(x);
}

/** Checks only the general shape of the envelope — does not validate `payload` by `type`, see the specific guards below. */
export function isChatEnvelope(x: unknown): x is ChatEnvelope {
  if (!isRecord(x)) return false;
  if (x.v !== 1) return false;
  if (!isMessageType(x.type)) return false;
  if (typeof x.turn_id !== "string" || x.turn_id.length === 0) return false;
  if (typeof x.ts !== "string" || x.ts.length === 0) return false;
  if (!("payload" in x)) return false;
  return true;
}

export function isUserMessagePayload(x: unknown): x is UserMessagePayload {
  return isRecord(x) && typeof x.text === "string";
}

export function isTextDeltaPayload(x: unknown): x is TextDeltaPayload {
  return isRecord(x) && typeof x.token === "string";
}

export function isTextDonePayload(x: unknown): x is TextDonePayload {
  return isRecord(x) && typeof x.text === "string";
}

export function isProfileConfirmedPayload(x: unknown): x is ProfileConfirmedPayload {
  if (!isRecord(x)) return false;
  if ("tipo_piel" in x && x.tipo_piel !== undefined && typeof x.tipo_piel !== "string") return false;
  if ("presupuesto" in x && x.presupuesto !== undefined && typeof x.presupuesto !== "number")
    return false;
  return true;
}

function isComboItem(x: unknown): x is ComboItem {
  return (
    isRecord(x) &&
    typeof x.producto_id === "string" &&
    typeof x.nombre === "string" &&
    typeof x.presentacion === "string" &&
    typeof x.precio_venta === "number"
  );
}

function isComboEntry(x: unknown): x is ComboEntry {
  return (
    isRecord(x) &&
    (x.nivel === "mas_barato" || x.nivel === "medio" || x.nivel === "premium") &&
    Array.isArray(x.items) &&
    x.items.length > 0 &&
    x.items.every(isComboItem) &&
    typeof x.total === "number"
  );
}

export function isComboRecommendationPayload(x: unknown): x is ComboRecommendationPayload {
  return (
    isRecord(x) && Array.isArray(x.combos) && x.combos.length === 3 && x.combos.every(isComboEntry)
  );
}

export function isNoRecommendationPayload(x: unknown): x is NoRecommendationPayload {
  return isRecord(x) && typeof x.mensaje === "string";
}

export function isUnavailablePayload(x: unknown): x is UnavailablePayload {
  return isRecord(x) && typeof x.reason === "string";
}

/**
 * Validates a full envelope by its declared `type`, dispatching to the
 * matching payload guard above. Returns `false` (never throws) for any
 * `type`/`payload` mismatch — the one entry point `transport.ts` needs to
 * decide "is this frame safe to hand to the reducer".
 */
export function isValidServerEnvelope(x: unknown): x is ChatEnvelope {
  if (!isChatEnvelope(x)) return false;
  switch (x.type) {
    case "text_delta":
      return isTextDeltaPayload(x.payload);
    case "text_done":
      return isTextDonePayload(x.payload);
    case "profile_confirmed":
      return isProfileConfirmedPayload(x.payload);
    case "combo_recommendation":
      return isComboRecommendationPayload(x.payload);
    case "no_recommendation":
      return isNoRecommendationPayload(x.payload);
    case "unavailable":
      return isUnavailablePayload(x.payload);
    case "user_message":
      // Client -> server only; a server frame of this type is malformed.
      return false;
    default:
      return false;
  }
}

/** Builds a valid `user_message` envelope — the only client -> server frame. */
export function makeUserMessageEnvelope(turnId: string, text: string): ChatEnvelope<UserMessagePayload> {
  return { v: 1, type: "user_message", turn_id: turnId, ts: new Date().toISOString(), payload: { text } };
}

/** uuid v4 when `crypto.randomUUID` is available (all supported browsers/Node 20+), a timestamp-based fallback otherwise. */
export function generateTurnId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `turn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
