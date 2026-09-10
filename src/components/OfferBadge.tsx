/**
 * Offer badge (spec 0005). Text + colour (not colour alone); `bg-sage-600` on
 * `text-beige-50` clears WCAG AA. `className` lets callers position it.
 */
export function OfferBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded bg-sage-600 px-2 py-0.5 text-xs font-medium text-beige-50 ${className}`}
    >
      Oferta
    </span>
  );
}
