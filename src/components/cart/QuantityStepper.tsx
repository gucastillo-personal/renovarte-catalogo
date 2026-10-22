import { MAX_POR_LINEA } from "@/lib/cart/model";
import { FOCUS_ATTR, type CartFocusKey } from "@/components/cart/focus-keys";

const BTN =
  "flex h-10 w-11 items-center justify-center text-lg text-sage-800 transition-colors hover:bg-sage-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sage-500 disabled:cursor-not-allowed disabled:text-sage-400 disabled:hover:bg-transparent";

export interface QuantityStepperProps {
  productoId: string;
  nombre: string;
  cantidad: number;
  onMinus(): void;
  onPlus(): void;
}

/**
 * Stepper de cantidad (ux.md "Líneas del carrito", "Accesibilidad"). "−" se
 * deshabilita en 1 (para sacar la línea se usa "Quitar") y "+" en el máximo.
 * El traspaso de foco al otro botón lo hace `CartView`.
 */
export function QuantityStepper({
  productoId,
  nombre,
  cantidad,
  onMinus,
  onPlus,
}: QuantityStepperProps) {
  const menos: CartFocusKey = `menos:${productoId}`;
  const mas: CartFocusKey = `mas:${productoId}`;
  return (
    <div
      role="group"
      aria-label={`Cantidad de ${nombre}`}
      className="inline-flex items-center rounded-lg border border-beige-300 bg-beige-50"
    >
      <button
        type="button"
        aria-label="Restar una unidad"
        disabled={cantidad <= 1}
        onClick={onMinus}
        {...{ [FOCUS_ATTR]: menos }}
        className={`${BTN} rounded-l-lg`}
      >
        <span aria-hidden="true">−</span>
      </button>
      {/* `<output>` es una live region implícita: se apaga, el cambio ya se anuncia desde la del sitio. */}
      <output aria-live="off" className="min-w-8 text-center font-medium tabular-nums">
        {cantidad}
      </output>
      <button
        type="button"
        aria-label="Sumar una unidad"
        disabled={cantidad >= MAX_POR_LINEA}
        onClick={onPlus}
        {...{ [FOCUS_ATTR]: mas }}
        className={`${BTN} rounded-r-lg`}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
