import { FOCUS_ATTR } from "@/components/cart/focus-keys";

const TEXT_BTN =
  "rounded text-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500";

export interface CartClearControlProps {
  confirming: boolean;
  onAsk(): void;
  onCancel(): void;
  onConfirm(): void;
}

/**
 * "Vaciar carrito" (ux.md): no vacía al tocarlo, se reemplaza en el mismo
 * lugar por la confirmación (sin `confirm()` nativo). El foco lo mueve
 * `CartView`: a "Cancelar" (la opción segura) al preguntar.
 */
export function CartClearControl({ confirming, onAsk, onCancel, onConfirm }: CartClearControlProps) {
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={onAsk}
        {...{ [FOCUS_ATTR]: "clear" }}
        className={`${TEXT_BTN} text-sage-700 hover:text-sage-900`}
      >
        Vaciar carrito
      </button>
    );
  }
  return (
    <div role="group" aria-label="Vaciar carrito" className="flex flex-col gap-2 text-sage-800">
      <p>
        <span className="font-semibold">¿Vaciar el carrito?</span> Se quitan todos los productos.
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-sage-500 px-4 py-2 font-medium text-beige-50 transition-colors hover:bg-sage-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
        >
          Sí, vaciar
        </button>
        <button
          type="button"
          onClick={onCancel}
          {...{ [FOCUS_ATTR]: "clear-cancel" }}
          className={`${TEXT_BTN} text-sage-700 hover:text-sage-900`}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
