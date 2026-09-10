/**
 * Manual offer list (spec 0005). serlaca's API has no promo field, so RenovArte
 * marks offers in `data/offers.json` (committed). Read at transform time.
 *
 * Shapes accepted for `codigos` (or the top-level value):
 *   ["A", "B"]                                  -> flag only (badge, no price change)
 *   { "A": {}, "B": { "descuento_pct": 10 } }   -> per-code, optional % off precio_venta
 */
import { existsSync, readFileSync } from "node:fs";

export interface Offer {
  /** Percent off `precio_venta`, 0..100. 0 = badge only. */
  descuentoPct: number;
}

function parseEntry(filePath: string, codigo: string, raw: unknown): Offer {
  if (raw === null || raw === undefined || (typeof raw === "object" && !Array.isArray(raw))) {
    const pct = (raw as { descuento_pct?: unknown } | null)?.descuento_pct;
    if (pct === undefined) return { descuentoPct: 0 };
    if (typeof pct !== "number" || !Number.isFinite(pct) || pct < 0 || pct >= 100) {
      throw new Error(
        `${filePath}: "${codigo}".descuento_pct inválido (esperado 0..100): ${JSON.stringify(pct)}`,
      );
    }
    return { descuentoPct: pct };
  }
  throw new Error(`${filePath}: entrada inválida para "${codigo}": ${JSON.stringify(raw)}`);
}

/**
 * Map of product code -> offer. A missing file is fine (no offers). Throws on
 * invalid JSON or an unexpected shape.
 */
export function loadOffers(filePath: string): Map<string, Offer> {
  if (!existsSync(filePath)) return new Map();

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (error) {
    throw new Error(`${filePath}: JSON inválido — ${(error as Error).message}`);
  }

  const value =
    Array.isArray(parsed) || (typeof parsed === "object" && parsed !== null && !("codigos" in parsed))
      ? parsed
      : (parsed as { codigos?: unknown }).codigos;

  const offers = new Map<string, Offer>();

  if (Array.isArray(value)) {
    for (const codigo of value) {
      if (typeof codigo !== "string") {
        throw new Error(`${filePath}: se esperaban strings en el array de códigos`);
      }
      const key = codigo.trim();
      if (key) offers.set(key, { descuentoPct: 0 });
    }
    return offers;
  }

  if (typeof value === "object" && value !== null) {
    for (const [codigo, raw] of Object.entries(value as Record<string, unknown>)) {
      const key = codigo.trim();
      if (key) offers.set(key, parseEntry(filePath, key, raw));
    }
    return offers;
  }

  throw new Error(
    `${filePath}: se esperaba { "codigos": [...] | {...} } o un array/objeto en la raíz`,
  );
}
