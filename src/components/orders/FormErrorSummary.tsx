import type { Ref } from "react";

import { AlertIcon } from "@/components/orders/AlertIcon";
import { mensajeError, type CampoContacto, type ErrorContacto } from "@/lib/orders/validate-contact";

export const TITULO_RESUMEN = "Revisá estos datos antes de enviar:";

export interface FormErrorSummaryProps {
  /** Ya en el orden del formulario: un ítem por campo con error. */
  errores: readonly ErrorContacto[];
  /** Cada ítem lleva al campo. */
  onFocusCampo(campo: CampoContacto): void;
  /** El foco va acá cuando la validación falla (ux.md "Validación"). */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Resumen de errores (ux.md "Validación" y "Accesibilidad"): contenedor con
 * `tabindex="-1"` etiquetado por su título; cada ítem es un botón que enfoca su
 * campo. Aparece siempre, aunque haya un solo error.
 */
export function FormErrorSummary({ errores, onFocusCampo, ref }: FormErrorSummaryProps) {
  return (
    <div
      ref={ref}
      role="group"
      tabIndex={-1}
      aria-labelledby="resumen-errores-titulo"
      className="rounded-lg border-[1.5px] border-sage-700 bg-beige-50 p-3 text-sage-800 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
    >
      <p id="resumen-errores-titulo" className="flex items-center gap-2 font-semibold">
        <AlertIcon />
        {TITULO_RESUMEN}
      </p>
      <ul className="mt-2 flex flex-col gap-1 pl-6 text-sm">
        {errores.map((e) => (
          <li key={e.campo} className="list-disc">
            <button
              type="button"
              onClick={() => onFocusCampo(e.campo)}
              className="rounded text-left underline underline-offset-4 hover:text-sage-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
            >
              {mensajeError(e.campo, e.codigo)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
