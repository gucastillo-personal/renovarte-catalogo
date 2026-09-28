import { describe, expect, it } from "vitest";

import { getUnavailableCopy } from "@/lib/chat/budget-copy";
import { CHAT_UNAVAILABLE_BUDGET_CAP, CHAT_UNAVAILABLE_GENERIC } from "@/lib/chat/content";

describe("getUnavailableCopy", () => {
  it("maps the 4 reasons from the RFC/local contract, exactly 2 variants used", () => {
    expect(getUnavailableCopy("budget_cap")).toBe(CHAT_UNAVAILABLE_BUDGET_CAP);
    expect(getUnavailableCopy("maintenance")).toBe(CHAT_UNAVAILABLE_GENERIC);
    expect(getUnavailableCopy("connection_error")).toBe(CHAT_UNAVAILABLE_GENERIC);
    expect(getUnavailableCopy("internal_error")).toBe(CHAT_UNAVAILABLE_GENERIC);
  });

  it("an unrecognized reason and undefined both fall back to the generic variant", () => {
    expect(getUnavailableCopy("something-new")).toBe(CHAT_UNAVAILABLE_GENERIC);
    expect(getUnavailableCopy(undefined)).toBe(CHAT_UNAVAILABLE_GENERIC);
  });
});
