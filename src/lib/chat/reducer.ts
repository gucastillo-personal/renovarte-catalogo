import { CHAT_CHANGE_PROFILE_PLACEHOLDER, CHAT_COMPOSER_PLACEHOLDER } from "@/lib/chat/content";
import type { ChatEnvelope, ComboEntry } from "@/lib/chat/types";

/**
 * Conversation state machine (T3, `plan.md` "## Frontend"). Pure — every
 * transition is a plain reducer function, so `transport.ts`/`ChatProvider`
 * only need to turn wire/DOM events into `ChatAction`s and this module owns
 * every rule `ux.md` describes (connection phases, the announceable message
 * log vs. the streaming buffer, partial profile merge, chip visibility,
 * "Cambiar" placeholder).
 */

export type ConnectionPhase = "idle" | "connecting" | "connecting_slow" | "ready" | "unavailable";

export interface ChatProfile {
  tipoPiel?: string;
  presupuesto?: number;
}

export type ChatMessage =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "assistant_text"; text: string; turnId: string }
  | {
      id: string;
      kind: "combo_recommendation";
      combos: [ComboEntry, ComboEntry, ComboEntry];
      turnId: string;
      /**
       * Snapshot of `profile.presupuesto` at the moment this combo turn
       * arrived — not read live from `state.profile` at render time, so a
       * later "Cambiar" doesn't retroactively rewrite the budget-relation
       * text (`ux.md` "Card de combo") of an already-rendered turn.
       */
      presupuesto: number | undefined;
    }
  | { id: string; kind: "no_recommendation"; mensaje: string; turnId: string };

export interface ChatState {
  isOpen: boolean;
  phase: ConnectionPhase;
  /** Set only while `phase === "unavailable"`. `undefined` means "not known yet" (falls back to the generic copy, `budget-copy.ts`). */
  unavailableReason: string | undefined;
  /** Only content that gets announced (`role="log"`) lives here — never `text_delta` tokens (`ux.md` "Accesibilidad": "nunca por token"). */
  messages: ChatMessage[];
  /** In-flight `text_delta` tokens for the current turn — rendered outside the log until `text_done` flushes it in. */
  streamingText: string;
  streamingTurnId: string | null;
  /** "Colibrí está escribiendo" — true from the user's turn until the first content-bearing envelope for it arrives. */
  isAssistantTyping: boolean;
  /** The `turn_id` the composer is waiting on; `null` once it can accept a new message. */
  pendingTurnId: string | null;
  profile: ChatProfile;
  /** Visible only until the visitor's first message (`ux.md` "Arranque de la conversación"). */
  showExampleChips: boolean;
  composerPlaceholder: string;
}

export const initialChatState: ChatState = {
  isOpen: false,
  phase: "idle",
  unavailableReason: undefined,
  messages: [],
  streamingText: "",
  streamingTurnId: null,
  isAssistantTyping: false,
  pendingTurnId: null,
  profile: {},
  showExampleChips: true,
  composerPlaceholder: CHAT_COMPOSER_PLACEHOLDER,
};

export type ChatAction =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "CONNECT_START" }
  | { type: "CONNECT_SLOW" }
  | { type: "CONNECT_READY" }
  | { type: "LOCAL_UNAVAILABLE"; reason: string }
  | { type: "USER_MESSAGE_SENT"; text: string; turnId: string }
  | { type: "SERVER_ENVELOPE"; envelope: ChatEnvelope }
  | { type: "REQUEST_CHANGE_PROFILE" };

function nextMessageId(state: ChatState, prefix: string, turnId: string): string {
  return `${prefix}-${turnId}-${state.messages.length}`;
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "OPEN":
      return { ...state, isOpen: true };

    case "CLOSE":
      // Deliberately does not reset phase/messages/profile — the socket and
      // the thread survive closing the panel within the same page load
      // (`plan.md`: "cerrar y reabrir el panel ... no reconecta ni pierde el
      // hilo").
      return { ...state, isOpen: false };

    case "CONNECT_START":
      return state.phase === "idle" ? { ...state, phase: "connecting" } : state;

    case "CONNECT_SLOW":
      return state.phase === "connecting" ? { ...state, phase: "connecting_slow" } : state;

    case "CONNECT_READY":
      return { ...state, phase: "ready", unavailableReason: undefined };

    case "LOCAL_UNAVAILABLE":
      return {
        ...state,
        phase: "unavailable",
        unavailableReason: action.reason,
        isAssistantTyping: false,
        pendingTurnId: null,
      };

    case "USER_MESSAGE_SENT":
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: `user-${action.turnId}`, kind: "user", text: action.text },
        ],
        showExampleChips: false,
        pendingTurnId: action.turnId,
        isAssistantTyping: true,
        streamingText: "",
        streamingTurnId: null,
      };

    case "REQUEST_CHANGE_PROFILE":
      return { ...state, composerPlaceholder: CHAT_CHANGE_PROFILE_PLACEHOLDER };

    case "SERVER_ENVELOPE":
      return applyServerEnvelope(state, action.envelope);

    default:
      return state;
  }
}

function clearPendingIfMatches(state: ChatState, turnId: string): Partial<ChatState> {
  return state.pendingTurnId === turnId ? { pendingTurnId: null } : {};
}

function applyServerEnvelope(state: ChatState, envelope: ChatEnvelope): ChatState {
  switch (envelope.type) {
    case "text_delta": {
      const payload = envelope.payload as { token: string };
      const sameTurn = state.streamingTurnId === null || state.streamingTurnId === envelope.turn_id;
      return {
        ...state,
        isAssistantTyping: false,
        streamingTurnId: envelope.turn_id,
        streamingText: sameTurn ? state.streamingText + payload.token : payload.token,
      };
    }

    case "text_done": {
      const payload = envelope.payload as { text: string };
      return {
        ...state,
        isAssistantTyping: false,
        streamingText: "",
        streamingTurnId: null,
        messages: [
          ...state.messages,
          {
            id: nextMessageId(state, "text", envelope.turn_id),
            kind: "assistant_text",
            text: payload.text,
            turnId: envelope.turn_id,
          },
        ],
        ...clearPendingIfMatches(state, envelope.turn_id),
      };
    }

    case "profile_confirmed": {
      const payload = envelope.payload as { tipo_piel?: string; presupuesto?: number };
      return {
        ...state,
        profile: {
          tipoPiel: payload.tipo_piel !== undefined ? payload.tipo_piel : state.profile.tipoPiel,
          presupuesto:
            payload.presupuesto !== undefined ? payload.presupuesto : state.profile.presupuesto,
        },
      };
    }

    case "combo_recommendation": {
      const payload = envelope.payload as {
        combos: [ComboEntry, ComboEntry, ComboEntry];
      };
      return {
        ...state,
        isAssistantTyping: false,
        messages: [
          ...state.messages,
          {
            id: nextMessageId(state, "combos", envelope.turn_id),
            kind: "combo_recommendation",
            combos: payload.combos,
            turnId: envelope.turn_id,
            presupuesto: state.profile.presupuesto,
          },
        ],
        ...clearPendingIfMatches(state, envelope.turn_id),
      };
    }

    case "no_recommendation": {
      const payload = envelope.payload as { mensaje: string };
      return {
        ...state,
        isAssistantTyping: false,
        messages: [
          ...state.messages,
          {
            id: nextMessageId(state, "norec", envelope.turn_id),
            kind: "no_recommendation",
            mensaje: payload.mensaje,
            turnId: envelope.turn_id,
          },
        ],
        ...clearPendingIfMatches(state, envelope.turn_id),
      };
    }

    case "unavailable": {
      const payload = envelope.payload as { reason: string };
      return {
        ...state,
        phase: "unavailable",
        unavailableReason: payload.reason,
        isAssistantTyping: false,
        pendingTurnId: null,
      };
    }

    case "user_message":
    default:
      // Never sent by the server per the contract; defensively a no-op
      // rather than a thrown exception (AC-11).
      return state;
  }
}

/** Selector: is the composer usable right now (`ux.md` "Streaming / carga"). */
export function isComposerDisabled(state: ChatState): boolean {
  return state.phase !== "ready" || state.pendingTurnId !== null;
}
