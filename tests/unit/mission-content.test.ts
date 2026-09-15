import { describe, expect, it } from "vitest";

import { MISSION_SLIDES } from "@/lib/mission-content";

// AC-2 (spec 0011): the copy shown is exactly the "Contenido fuente" of
// spec.md — protects against drift if the section is ever restyled.
const SOURCE_TEXTS = [
  "Cada piel tiene su propia historia.",
  "Tu piel está viva. Cambia, respira, se transforma. Conocerla es el primer paso.",
  "El arte está en observar y elegir lo que cada piel necesita. Piel por piel.",
  "Renovarte no es empezar de cero.",
  "Este es nuestro comienzo.",
];

describe("MISSION_SLIDES", () => {
  it("has exactly the 5 messages from spec.md, in order 1 to 5", () => {
    expect(MISSION_SLIDES.map((s) => s.n)).toEqual([1, 2, 3, 4, 5]);
    expect(MISSION_SLIDES.map((s) => s.text)).toEqual(SOURCE_TEXTS);
  });
});
