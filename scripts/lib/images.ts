import { existsSync } from "node:fs";
import path from "node:path";

export const PLACEHOLDER_IMAGE = "/img/placeholder.svg";

// Real product photos win over the SVG placeholders shipped for the walking skeleton.
const EXT_PRIORITY = ["jpg", "jpeg", "webp", "png", "svg"] as const;

/**
 * Public path to a product's image. Returns `/img/laca/<codigo>.<ext>` for the
 * first matching file under `<publicDir>/img/laca/`, else the shared placeholder.
 */
export function resolveImagePath(codigo: string, publicDir: string): string {
  for (const ext of EXT_PRIORITY) {
    const rel = path.join("img", "laca", `${codigo}.${ext}`);
    if (existsSync(path.join(publicDir, rel))) {
      return `/${rel.split(path.sep).join("/")}`;
    }
  }
  return PLACEHOLDER_IMAGE;
}
