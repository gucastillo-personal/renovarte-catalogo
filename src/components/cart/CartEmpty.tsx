import Link from "next/link";

/**
 * Carrito vacío (AC-8, ux.md): mismo tratamiento de "sin resultados" de la
 * búsqueda. No hay formulario ni botón de enviar, así que no se puede generar
 * una orden vacía.
 */
export function CartEmpty({ onAskColibri }: { onAskColibri(trigger: HTMLElement): void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-beige-300 px-4 py-10 text-center text-sage-600">
      <p>Tu carrito está vacío.</p>
      <Link
        href="/#catalogo"
        className="rounded-lg bg-sage-500 px-5 py-3 font-medium text-beige-50 transition-colors hover:bg-sage-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
      >
        Ver catálogo
      </Link>
      <button
        type="button"
        onClick={(event) => onAskColibri(event.currentTarget)}
        aria-haspopup="dialog"
        className="rounded text-sm text-sage-700 underline underline-offset-4 hover:text-sage-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
      >
        ¿No sabés qué elegir? Pedile un combo a Colibrí
      </button>
    </div>
  );
}
