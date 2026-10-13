import { FOCUS_ATTR } from "@/components/cart/focus-keys";

/**
 * Fila que reemplaza a la línea quitada (ux.md "Quitar"): sin temporizador,
 * queda hasta la próxima acción en el carrito.
 */
export function CartUndoRow({ nombre, onUndo }: { nombre: string; onUndo(): void }) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 border-b border-beige-200 py-4 text-sage-700">
      <span>Quitaste {nombre}.</span>
      <button
        type="button"
        onClick={onUndo}
        {...{ [FOCUS_ATTR]: "undo" }}
        className="rounded font-semibold text-sage-800 underline underline-offset-4 hover:text-sage-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
      >
        Deshacer
      </button>
    </li>
  );
}
