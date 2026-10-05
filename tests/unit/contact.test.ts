import { describe, expect, it } from "vitest";

import {
  INSTAGRAM_DM_URL,
  INSTAGRAM_USER,
  RENOVARTE_EMAIL,
  mailtoConsulta,
} from "@/lib/contact";

describe("contact", () => {
  it("apunta al MD directo de Instagram", () => {
    expect(INSTAGRAM_USER).toBe("renovarte_by_juli");
    expect(INSTAGRAM_DM_URL).toBe("https://ig.me/m/renovarte_by_juli");
  });

  it("mailtoConsulta arma el asunto con el número de orden", () => {
    const url = mailtoConsulta("RA-48271");
    expect(url.startsWith(`mailto:${RENOVARTE_EMAIL}?subject=`)).toBe(true);
    const subject = new URL(url).searchParams.get("subject");
    expect(subject).toBe("Consulta por orden RA-48271");
  });
});
