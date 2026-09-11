import { formatARS } from "@/lib/format";
import type { Product } from "@/lib/types";

const FINAL_SIZE = { sm: "text-lg", lg: "text-3xl" } as const;
const REGULAR_SIZE = { sm: "text-xs", lg: "text-base" } as const;

/**
 * Product price (spec 0007). No offer -> a single price. On offer with a
 * discount -> previous price struck through (accessible label, not colour
 * alone) + final price + a "−N%" chip. Reused by `ProductCard` and the detail
 * page via `size`.
 */
export function ProductPrice({
  product,
  size = "sm",
  className = "",
}: {
  product: Product;
  size?: "sm" | "lg";
  className?: string;
}) {
  if (product.precio_regular === undefined || product.descuento_pct === undefined) {
    return (
      <p className={`${FINAL_SIZE[size]} font-semibold text-sage-900 ${className}`}>
        {formatARS(product.precio_venta)}
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${className}`}>
      <p className={`${FINAL_SIZE[size]} font-semibold text-sage-900`}>
        {formatARS(product.precio_venta)}
      </p>
      <s className={`${REGULAR_SIZE[size]} text-sage-500`}>
        <span className="sr-only">Precio anterior: </span>
        {formatARS(product.precio_regular)}
      </s>
      <span
        data-testid="discount-chip"
        className="rounded bg-sage-100 px-1.5 py-0.5 text-xs font-medium text-sage-800"
      >
        −{product.descuento_pct}%
      </span>
    </div>
  );
}
