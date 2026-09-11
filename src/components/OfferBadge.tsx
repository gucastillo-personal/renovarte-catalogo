/**
 * Offer badge (spec 0005; `descuentoPct` added by spec 0007). Text + colour
 * (not colour alone); `bg-sage-600` on `text-beige-50` clears WCAG AA.
 * `className` lets callers position it. Shows "−N%" when there's a discount,
 * otherwise the flag-only "Oferta".
 */
export function OfferBadge({
  descuentoPct,
  className = "",
}: {
  descuentoPct?: number;
  className?: string;
}) {
  return (
    <span
      data-testid="offer-badge"
      className={`inline-block rounded bg-sage-600 px-2 py-0.5 text-xs font-medium text-beige-50 ${className}`}
    >
      {descuentoPct ? `−${descuentoPct}%` : "Oferta"}
    </span>
  );
}
