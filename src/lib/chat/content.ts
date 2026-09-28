/**
 * Client-only copy for the Colibrí chat widget (spec 0016). Everything here
 * is a **draft**, not approved final copy — same status `ux.md` gives it
 * ("Mapeo de contenido": "Copy de saludo inicial, chips de ejemplo, mensaje
 * de 'sin recomendación', mensaje de 'no disponible' — Autoría UX ...
 * queda sujeto a validación del CTO/CEO"). Ships as a placeholder so the
 * feature is demoable; pending a product pass before it's considered final.
 *
 * No logic here on purpose (T5) — just strings, consumed by `reducer.ts`,
 * `budget-copy.ts` and the components that render them.
 */

export const CHAT_TITLE = "Colibrí";

export const CHAT_GREETING =
  "¡Hola! Soy Colibrí. Contame tu tipo de piel y cuánto querés gastar, y te armo 3 combos de cremas para elegir.";

export const CHAT_EXAMPLE_PROMPTS: readonly string[] = [
  "Piel seca, presupuesto $50.000",
  "Tengo piel grasa y quiero gastar hasta $40.000",
  "¿Qué me recomendás para piel mixta?",
];

export const CHAT_COMPOSER_PLACEHOLDER = "Escribí tu mensaje";

export const CHAT_CHANGE_PROFILE_PLACEHOLDER = "Contame el nuevo tipo de piel o presupuesto";

export const CHAT_CHANGE_PROFILE_LABEL = "Cambiar tipo de piel o presupuesto";

export const CHAT_TYPING_ANNOUNCEMENT = "Colibrí está escribiendo";

export interface UnavailableCopy {
  heading: string;
  body: string;
  placeholder: string;
}

export const CHAT_UNAVAILABLE_BUDGET_CAP: UnavailableCopy = {
  heading: "Colibrí no está disponible por el momento",
  body: "Colibrí llegó a su límite de uso por este mes. El resto del catálogo funciona con total normalidad — probá el chat de nuevo el mes que viene.",
  placeholder: "Chat no disponible por el momento",
};

export const CHAT_UNAVAILABLE_GENERIC: UnavailableCopy = {
  heading: "Colibrí no está disponible por el momento",
  body: "Colibrí no está disponible en este momento. Podés seguir navegando el catálogo con normalidad — probá de nuevo más tarde.",
  placeholder: "Chat no disponible por el momento",
};

export const CHAT_NO_RECOMMENDATION_SR_PREFIX = "Colibrí respondió: ";
