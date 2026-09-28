import { describe, expect, it } from "vitest";

import {
  isChatEnvelope,
  isComboRecommendationPayload,
  isNoRecommendationPayload,
  isProfileConfirmedPayload,
  isTextDeltaPayload,
  isTextDonePayload,
  isUnavailablePayload,
  isUserMessagePayload,
  isValidServerEnvelope,
  makeUserMessageEnvelope,
  type ChatEnvelope,
} from "@/lib/chat/types";

const TURN_ID = "11111111-1111-4111-8111-111111111111";
const TS = "2026-09-28T00:00:00.000Z";

function envelope<T>(type: ChatEnvelope["type"], payload: T): ChatEnvelope<T> {
  return { v: 1, type, turn_id: TURN_ID, ts: TS, payload };
}

describe("isChatEnvelope", () => {
  it("accepts a well-formed envelope shell", () => {
    expect(isChatEnvelope(envelope("text_done", { text: "hola" }))).toBe(true);
  });

  it("rejects non-objects, wrong version, unknown type, missing turn_id/ts", () => {
    expect(isChatEnvelope(null)).toBe(false);
    expect(isChatEnvelope("x")).toBe(false);
    expect(isChatEnvelope({ ...envelope("text_done", {}), v: 2 })).toBe(false);
    expect(isChatEnvelope({ ...envelope("text_done", {}), type: "bogus" })).toBe(false);
    expect(isChatEnvelope({ ...envelope("text_done", {}), turn_id: "" })).toBe(false);
    expect(isChatEnvelope({ ...envelope("text_done", {}), ts: undefined })).toBe(false);
  });
});

describe("per-payload guards — one accept + one reject each (the 7 types)", () => {
  it("user_message", () => {
    expect(isUserMessagePayload({ text: "hola" })).toBe(true);
    expect(isUserMessagePayload({ text: 5 })).toBe(false);
  });

  it("text_delta", () => {
    expect(isTextDeltaPayload({ token: "a" })).toBe(true);
    expect(isTextDeltaPayload({})).toBe(false);
  });

  it("text_done", () => {
    expect(isTextDonePayload({ text: "hola" })).toBe(true);
    expect(isTextDonePayload({ text: null })).toBe(false);
  });

  it("profile_confirmed — both fields optional, wrong type rejected", () => {
    expect(isProfileConfirmedPayload({})).toBe(true);
    expect(isProfileConfirmedPayload({ tipo_piel: "seca" })).toBe(true);
    expect(isProfileConfirmedPayload({ presupuesto: 40000 })).toBe(true);
    expect(isProfileConfirmedPayload({ tipo_piel: "seca", presupuesto: 40000 })).toBe(true);
    expect(isProfileConfirmedPayload({ presupuesto: "40000" })).toBe(false);
  });

  it("combo_recommendation — exactly 3 well-formed combos, 2+ items each", () => {
    const combo = {
      nivel: "mas_barato",
      items: [
        { producto_id: "1", nombre: "A", presentacion: "100ml", precio_venta: 1000 },
        { producto_id: "2", nombre: "B", presentacion: "50ml", precio_venta: 2000 },
      ],
      total: 3000,
    };
    expect(isComboRecommendationPayload({ combos: [combo, combo, combo] })).toBe(true);
    expect(isComboRecommendationPayload({ combos: [combo, combo] })).toBe(false);
    expect(
      isComboRecommendationPayload({
        combos: [{ ...combo, items: [] }, combo, combo],
      }),
    ).toBe(false);
  });

  it("no_recommendation", () => {
    expect(isNoRecommendationPayload({ mensaje: "no hay" })).toBe(true);
    expect(isNoRecommendationPayload({})).toBe(false);
  });

  it("unavailable", () => {
    expect(isUnavailablePayload({ reason: "budget_cap" })).toBe(true);
    expect(isUnavailablePayload({ reason: 1 })).toBe(false);
  });
});

describe("isValidServerEnvelope", () => {
  it("accepts each of the 6 server -> client envelopes", () => {
    expect(isValidServerEnvelope(envelope("text_delta", { token: "a" }))).toBe(true);
    expect(isValidServerEnvelope(envelope("text_done", { text: "a" }))).toBe(true);
    expect(isValidServerEnvelope(envelope("profile_confirmed", {}))).toBe(true);
    expect(
      isValidServerEnvelope(
        envelope("combo_recommendation", {
          combos: [
            {
              nivel: "mas_barato",
              items: [{ producto_id: "1", nombre: "A", presentacion: "x", precio_venta: 1 }],
              total: 1,
            },
            {
              nivel: "medio",
              items: [{ producto_id: "2", nombre: "B", presentacion: "x", precio_venta: 2 }],
              total: 2,
            },
            {
              nivel: "premium",
              items: [{ producto_id: "3", nombre: "C", presentacion: "x", precio_venta: 3 }],
              total: 3,
            },
          ],
        }),
      ),
    ).toBe(true);
    expect(isValidServerEnvelope(envelope("no_recommendation", { mensaje: "x" }))).toBe(true);
    expect(isValidServerEnvelope(envelope("unavailable", { reason: "budget_cap" }))).toBe(true);
  });

  it("rejects a user_message envelope (client -> server only) and any payload/type mismatch", () => {
    expect(isValidServerEnvelope(envelope("user_message", { text: "hola" }))).toBe(false);
    expect(isValidServerEnvelope(envelope("text_done", { token: "a" }))).toBe(false);
    expect(isValidServerEnvelope({ not: "an envelope" })).toBe(false);
  });
});

describe("makeUserMessageEnvelope", () => {
  it("builds a valid, guard-passing envelope", () => {
    const env = makeUserMessageEnvelope(TURN_ID, "piel seca");
    expect(env.type).toBe("user_message");
    expect(env.turn_id).toBe(TURN_ID);
    expect(env.payload.text).toBe("piel seca");
    expect(isChatEnvelope(env)).toBe(true);
  });
});
