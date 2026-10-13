import { productosLabel } from "@/lib/cart/copy";
import { formatARS } from "@/lib/format";

/** Caja de resumen (ux.md ítem 6): total y la aclaración de AC-12. */
export function CartSummary({
  unidades,
  total,
  children,
}: {
  unidades: number;
  total: number;
  /** Lo que va debajo, separado por `border-t` (el formulario, en F12). */
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-label="Resumen del carrito"
      className="rounded-lg border border-beige-200 bg-beige-100 p-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sage-800">Total ({productosLabel(unidades)})</p>
        <p className="text-2xl font-semibold tabular-nums text-sage-900">{formatARS(total)}</p>
      </div>
      <p className="mt-2 text-sm text-sage-700">
        No se cobra nada en este paso. RenovArte te contacta para coordinar el pago y el envío.
      </p>
      {children && <div className="mt-4 border-t border-beige-200 pt-4">{children}</div>}
    </section>
  );
}
