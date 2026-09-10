/**
 * Text helpers for the serlaca API adapter (spec 0009). The API returns product
 * copy as HTML with named/numeric entities (`&iacute;`, `<p>`, `<br />`,
 * `\r\n`) and product names sometimes ALL IN CAPS.
 */

// Named entities that actually appear in serlaca `detail` fields, plus the
// common Latin-1 / punctuation set. Anything else falls through unchanged.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  ntilde: "ñ", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü", agrave: "à",
  ordf: "ª", ordm: "º", deg: "°", trade: "™", reg: "®", copy: "©",
  laquo: "«", raquo: "»", hellip: "…", mdash: "—", ndash: "–",
  rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”",
  middot: "·", euro: "€", pound: "£", cent: "¢", plusmn: "±",
  times: "×", divide: "÷", frac12: "½", frac14: "¼", frac34: "¾",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    if (body.startsWith("#")) {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = isHex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body)
      ? NAMED_ENTITIES[body]!
      : match;
  });
}

/** HTML → readable plain text: block tags become newlines, other tags drop, entities decode. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  const withBreaks = html
    .replace(/<\s*(br|hr)\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|ul|ol|h[1-6]|tr)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(withBreaks)
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Collapse whitespace; Title Case a name that arrives entirely upper-cased. */
export function cleanName(raw: string): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  const letters = collapsed.replace(/[^\p{L}]/gu, "");
  const isAllCaps = letters.length > 0 && letters === letters.toUpperCase();
  if (!isAllCaps) return collapsed;
  return collapsed
    .toLowerCase()
    .split(" ")
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** `{ size: 250, measurementCode: "mL" }` → `"250 ml"`. Null / bad → `""`. */
export function formatSize(
  size: { size: number; measurementCode: string } | null | undefined,
): string {
  if (!size || typeof size.size !== "number" || !Number.isFinite(size.size)) return "";
  const amount = String(size.size);
  const unit = (size.measurementCode ?? "").trim().toLowerCase();
  return unit ? `${amount} ${unit}` : amount;
}
