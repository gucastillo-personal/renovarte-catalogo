/**
 * Shared chip token classes (spec 0012 brand alignment, docs/brand.md).
 * Extracted out of `CategoryNav.tsx` (spec 0015) so the new nivel-2
 * component (`GroupCategoryNav`) doesn't duplicate them — no new color
 * token, just a shared module for the same constants.
 */
export const CHIP =
  "rounded-full px-3 py-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500";
export const INACTIVE = "bg-sage-100 text-sage-700 hover:bg-sage-200";
export const ACTIVE = "bg-sage-500 text-beige-50";
export const OFFERS = "bg-sage-100 text-sage-800 hover:bg-sage-200";

/**
 * Nivel-2 chip (spec 0015, `ux.md` "Layout"): a step smaller than `CHIP` —
 * `text-xs` instead of `text-sm`, proportionally reduced padding — same
 * color tokens (`INACTIVE`/`ACTIVE` above). Size, not color, is what reads
 * as "nested under nivel 1".
 */
export const CHIP_SM =
  "rounded-full px-2.5 py-0.5 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500";

/**
 * The existing static tag-chip style used on `/producto/[id]` for the
 * `categoria` chip (predates spec 0015). Extracted so the new per-group
 * chips on that same page (`ux.md` "Layout") reuse it verbatim instead of
 * inventing a new variant.
 */
export const TAG_CHIP = "rounded bg-sage-100 px-2 py-0.5 text-sm text-sage-700 hover:bg-sage-200";
