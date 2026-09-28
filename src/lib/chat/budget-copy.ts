import {
  CHAT_UNAVAILABLE_BUDGET_CAP,
  CHAT_UNAVAILABLE_GENERIC,
  type UnavailableCopy,
} from "@/lib/chat/content";

/**
 * Maps an `UnavailablePayload.reason` (transport, RFC §3) — or a local
 * reason the client itself invents (`"connection_error"` when
 * `NEXT_PUBLIC_CHAT_WS_URL` is unset or the handshake fails, `undefined`
 * before any reason is known) — to exactly one of 2 copy variants
 * (`ux.md` "Estado 'chat no disponible'"): a dedicated one for the spend
 * cap, a generic one for everything else. Only `"budget_cap"` gets the
 * dedicated copy; any other known reason from the RFC
 * (`"maintenance"`, `"internal_error"`), any local reason
 * (`"connection_error"`), and any unrecognized string all collapse to the
 * generic variant — same criterion `ux.md` Pregunta abierta #2 already
 * accepted ("si el backend solo expone un genérico ... colapso a un solo
 * mensaje").
 */
export function getUnavailableCopy(reason: string | undefined): UnavailableCopy {
  return reason === "budget_cap" ? CHAT_UNAVAILABLE_BUDGET_CAP : CHAT_UNAVAILABLE_GENERIC;
}
