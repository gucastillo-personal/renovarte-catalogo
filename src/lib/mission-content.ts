/**
 * Copy source for the mission/brand carousel (spec 0011). The 5 core
 * messages of @renovarte_by_juli's founding Instagram post, transcribed by
 * the CTO/CEO in `spec.md` ("Contenido fuente") — used verbatim here so a
 * unit test can protect against copy drift without rendering any React.
 */
export type MissionSlide = { n: 1 | 2 | 3 | 4 | 5; text: string };

export const MISSION_SLIDES: readonly MissionSlide[] = [
  { n: 1, text: "Cada piel tiene su propia historia." },
  {
    n: 2,
    text: "Tu piel está viva. Cambia, respira, se transforma. Conocerla es el primer paso.",
  },
  {
    n: 3,
    text: "El arte está en observar y elegir lo que cada piel necesita. Piel por piel.",
  },
  { n: 4, text: "Renovarte no es empezar de cero." },
  { n: 5, text: "Este es nuestro comienzo." },
];
