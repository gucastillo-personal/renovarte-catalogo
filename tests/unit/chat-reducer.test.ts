import { describe, expect, it } from "vitest";

import {
  chatReducer,
  initialChatState,
  isComposerDisabled,
  type ChatState,
} from "@/lib/chat/reducer";
import type { ChatEnvelope, ComboEntry } from "@/lib/chat/types";

const TURN_1 = "turn-1";
const TS = "2026-09-28T00:00:00.000Z";

function envelope<T>(type: ChatEnvelope["type"], payload: T, turnId = TURN_1): ChatEnvelope<T> {
  return { v: 1, type, turn_id: turnId, ts: TS, payload };
}

function combo(nivel: ComboEntry["nivel"], total: number): ComboEntry {
  return {
    nivel,
    items: [
      { producto_id: "1", nombre: "A", presentacion: "100ml", precio_venta: total / 2 },
      { producto_id: "2", nombre: "B", presentacion: "50ml", precio_venta: total / 2 },
    ],
    total,
  };
}

describe("connection phase (AC-1, AC-13)", () => {
  it("idle -> connecting -> connecting_slow -> ready", () => {
    let state = initialChatState;
    expect(state.phase).toBe("idle");
    state = chatReducer(state, { type: "CONNECT_START" });
    expect(state.phase).toBe("connecting");
    state = chatReducer(state, { type: "CONNECT_SLOW" });
    expect(state.phase).toBe("connecting_slow");
    state = chatReducer(state, { type: "CONNECT_READY" });
    expect(state.phase).toBe("ready");
  });

  it("CONNECT_SLOW is a no-op once already ready (guards against a stale timer firing late)", () => {
    let state = chatReducer(initialChatState, { type: "CONNECT_START" });
    state = chatReducer(state, { type: "CONNECT_READY" });
    state = chatReducer(state, { type: "CONNECT_SLOW" });
    expect(state.phase).toBe("ready");
  });

  it("LOCAL_UNAVAILABLE (env var missing / handshake failure) sets phase + reason, clears pending turn", () => {
    let state = chatReducer(initialChatState, { type: "CONNECT_START" });
    state = chatReducer(state, { type: "LOCAL_UNAVAILABLE", reason: "connection_error" });
    expect(state.phase).toBe("unavailable");
    expect(state.unavailableReason).toBe("connection_error");
  });

  it("OPEN/CLOSE toggle isOpen without touching phase or the message log (persists within the same page load)", () => {
    let state = chatReducer(initialChatState, { type: "CONNECT_START" });
    state = chatReducer(state, { type: "CONNECT_READY" });
    state = chatReducer(state, { type: "OPEN" });
    expect(state.isOpen).toBe(true);
    state = chatReducer(state, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("text_done", { text: "hola" }),
    });
    state = chatReducer(state, { type: "CLOSE" });
    expect(state.isOpen).toBe(false);
    expect(state.phase).toBe("ready");
    expect(state.messages).toHaveLength(1);
    state = chatReducer(state, { type: "OPEN" });
    expect(state.messages).toHaveLength(1);
  });
});

describe("user turn lifecycle (AC-2, composer disabled state)", () => {
  const ready: ChatState = { ...initialChatState, phase: "ready" };

  it("USER_MESSAGE_SENT appends a user message, hides chips, sets pendingTurnId, shows typing", () => {
    const state = chatReducer(ready, { type: "USER_MESSAGE_SENT", text: "piel seca", turnId: TURN_1 });
    expect(state.messages).toEqual([{ id: `user-${TURN_1}`, kind: "user", text: "piel seca" }]);
    expect(state.showExampleChips).toBe(false);
    expect(state.pendingTurnId).toBe(TURN_1);
    expect(state.isAssistantTyping).toBe(true);
    expect(isComposerDisabled(state)).toBe(true);
  });

  it("composer is disabled while phase isn't ready, even with no pending turn", () => {
    expect(isComposerDisabled(initialChatState)).toBe(true);
    expect(isComposerDisabled(ready)).toBe(false);
  });

  it("text_delta buffers tokens outside the message log, never announced", () => {
    let state = chatReducer(ready, { type: "USER_MESSAGE_SENT", text: "hola", turnId: TURN_1 });
    state = chatReducer(state, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("text_delta", { token: "Hola" }),
    });
    state = chatReducer(state, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("text_delta", { token: " que" }),
    });
    expect(state.streamingText).toBe("Hola que");
    expect(state.messages).toHaveLength(1); // only the user message, no delta in the log
    expect(state.isAssistantTyping).toBe(false); // dots replaced by the growing bubble
    expect(isComposerDisabled(state)).toBe(true); // turn still pending
  });

  it("text_done flushes the buffer into the log and clears the pending turn (clarification/off_topic terminal case)", () => {
    let state = chatReducer(ready, { type: "USER_MESSAGE_SENT", text: "hola", turnId: TURN_1 });
    state = chatReducer(state, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("text_delta", { token: "¿Cuál es tu presupuesto?" }),
    });
    state = chatReducer(state, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("text_done", { text: "¿Cuál es tu presupuesto?" }),
    });
    expect(state.streamingText).toBe("");
    expect(state.messages).toEqual([
      { id: `user-${TURN_1}`, kind: "user", text: "hola" },
      {
        id: `text-${TURN_1}-1`,
        kind: "assistant_text",
        text: "¿Cuál es tu presupuesto?",
        turnId: TURN_1,
      },
    ]);
    expect(state.pendingTurnId).toBeNull();
    expect(isComposerDisabled(state)).toBe(false);
  });
});

describe("profile_confirmed — partial merge (AC-2, barra de resumen)", () => {
  it("only overwrites fields present in the payload, never clears the other one", () => {
    let state = chatReducer(initialChatState, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("profile_confirmed", { tipo_piel: "seca" }),
    });
    expect(state.profile).toEqual({ tipoPiel: "seca", presupuesto: undefined });

    state = chatReducer(state, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("profile_confirmed", { presupuesto: 40000 }),
    });
    expect(state.profile).toEqual({ tipoPiel: "seca", presupuesto: 40000 });

    state = chatReducer(state, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("profile_confirmed", { tipo_piel: "grasa" }),
    });
    expect(state.profile).toEqual({ tipoPiel: "grasa", presupuesto: 40000 });
  });

  it("updates (never duplicates) — profile_confirmed never adds a message to the log", () => {
    let state = chatReducer(initialChatState, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("profile_confirmed", { tipo_piel: "seca", presupuesto: 40000 }),
    });
    state = chatReducer(state, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("profile_confirmed", { presupuesto: 50000 }),
    });
    expect(state.messages).toHaveLength(0);
    expect(state.profile).toEqual({ tipoPiel: "seca", presupuesto: 50000 });
  });

  it("REQUEST_CHANGE_PROFILE swaps the composer placeholder", () => {
    const state = chatReducer(initialChatState, { type: "REQUEST_CHANGE_PROFILE" });
    expect(state.composerPlaceholder).not.toBe(initialChatState.composerPlaceholder);
  });
});

describe("combo_recommendation (AC-3, AC-5, AC-7, AC-8, AC-9 — shape only, ai-agent guarantees the numbers)", () => {
  const ready: ChatState = { ...initialChatState, phase: "ready" };

  it("renders exactly the 3 combos as they arrive, ascending order preserved, clears pending turn", () => {
    let state = chatReducer(ready, { type: "USER_MESSAGE_SENT", text: "piel seca $50000", turnId: TURN_1 });
    state = chatReducer(state, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("text_done", { text: "Encontré estas opciones para vos" }),
    });
    expect(isComposerDisabled(state)).toBe(false); // text_done alone already frees the composer per T13

    state = chatReducer(state, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("combo_recommendation", {
        combos: [combo("mas_barato", 30000), combo("medio", 40000), combo("premium", 55000)],
      }),
    });

    const comboMessage = state.messages.at(-1);
    expect(comboMessage?.kind).toBe("combo_recommendation");
    if (comboMessage?.kind === "combo_recommendation") {
      expect(comboMessage.combos.map((c) => c.total)).toEqual([30000, 40000, 55000]);
      expect(comboMessage.combos.every((c) => c.items.length >= 2)).toBe(true);
    }
    expect(state.pendingTurnId).toBeNull();
  });
});

describe("no_recommendation (AC-6)", () => {
  it("renders as a plain message, same shape family as assistant_text, no special error state", () => {
    let state = chatReducer({ ...initialChatState, phase: "ready" }, {
      type: "USER_MESSAGE_SENT",
      text: "algo raro",
      turnId: TURN_1,
    });
    state = chatReducer(state, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("no_recommendation", {
        mensaje: "No tengo una recomendación para eso.",
      }),
    });
    const last = state.messages.at(-1);
    expect(last).toEqual({
      id: `norec-${TURN_1}-1`,
      kind: "no_recommendation",
      mensaje: "No tengo una recomendación para eso.",
      turnId: TURN_1,
    });
    expect(state.phase).toBe("ready"); // no_recommendation never flips the connection phase
    expect(state.pendingTurnId).toBeNull();
  });
});

describe("unavailable mid-conversation (AC-13)", () => {
  it("keeps the existing thread intact, only phase/reason change", () => {
    let state = chatReducer({ ...initialChatState, phase: "ready" }, {
      type: "USER_MESSAGE_SENT",
      text: "hola",
      turnId: TURN_1,
    });
    state = chatReducer(state, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("text_done", { text: "¡Hola!" }),
    });
    const messagesBefore = state.messages;

    state = chatReducer(state, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("unavailable", { reason: "budget_cap" }, "turn-2"),
    });

    expect(state.phase).toBe("unavailable");
    expect(state.unavailableReason).toBe("budget_cap");
    expect(state.messages).toBe(messagesBefore); // same array reference — untouched
  });
});

describe("malformed/unexpected envelope types never throw", () => {
  it("a server-sent user_message (contract violation) is a no-op, not a crash", () => {
    const state = chatReducer(initialChatState, {
      type: "SERVER_ENVELOPE",
      envelope: envelope("user_message", { text: "should never happen" }),
    });
    expect(state).toEqual(initialChatState);
  });
});
