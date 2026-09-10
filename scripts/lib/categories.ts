/**
 * Category name cleanup for the transform stage (spec 0009). serlaca's
 * `productLine.name` arrives with trailing periods (`"Uñas."`), typo duplicates
 * (`"Uñas."` vs `"Uñas"`), a missing accent (`"Proteccion Solar."`) and a few
 * unwieldy slash-lists.
 */

// Key = category after trailing-dot/space strip, lower-cased.
// Value = the display name to use. Edit freely to taste.
const RENAMES: Record<string, string> = {
  "proteccion solar": "Protección Solar",
  "correctores / iluminadores": "Correctores e Iluminadores",
  "hidratación-humectación-tonificación": "Hidratación",
  "paletas / pincelería / artístico": "Pinceles y Paletas",
  "pre bases / bases / polvos / rubores / fijadores / preparación piel": "Rostro",
  "dermatocosmética dr. enero": "Dr. Enero",
};

/** Trim, collapse spaces, drop a trailing "." , then apply the rename map. */
export function cleanCategory(raw: string): string {
  const trimmed = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.\s]+$/u, "");
  return RENAMES[trimmed.toLowerCase()] ?? trimmed;
}
