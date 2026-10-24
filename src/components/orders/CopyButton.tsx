"use client";

import { useEffect, useRef, useState } from "react";

/** Cuánto dura el label "Copiado" (ux.md "Confirmación", punto 2). */
export const COPIADO_MS = 1600;

export interface CopyButtonProps {
  /** Lo que va al portapapeles. */
  text: string;
  /** Label visible. */
  label?: string;
  /** Nombre accesible completo (el label solo no dice qué se copia). */
  ariaLabel?: string;
  /**
   * Si el portapapeles falla: el llamador selecciona el texto que ya está en
   * pantalla (p. ej. el número de orden). Sin esta función se muestra el texto
   * en un `textarea` de solo lectura ya seleccionado (ux.md).
   */
  onCopyFail?(): void;
  /** Para el botón grande ("Copiar detalle del pedido") o el chico ("Copiar"). */
  className?: string;
  /** Inyectables en tests. */
  clipboard?: Pick<Clipboard, "writeText"> | null;
  schedule?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancel?: (h: ReturnType<typeof setTimeout>) => void;
}

const BTN =
  "rounded-lg border border-sage-500 px-3 py-1.5 text-sm font-medium text-sage-700 transition-colors hover:bg-sage-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500";

/**
 * Copia `text` al portapapeles. El label pasa a "Copiado" por 1,6 s. Si el
 * portapapeles no está o falla, cae a `onCopyFail` o a un `textarea` readonly
 * seleccionado, para que el visitante pueda copiar a mano.
 */
export function CopyButton({
  text,
  label = "Copiar",
  ariaLabel,
  onCopyFail,
  className = BTN,
  clipboard,
  schedule = (fn, ms) => globalThis.setTimeout(fn, ms),
  cancel = (h) => globalThis.clearTimeout(h),
}: CopyButtonProps) {
  const [copiado, setCopiado] = useState(false);
  const [manual, setManual] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) cancel(timer.current);
    },
    // `cancel` es un wrapper estable por render; solo importa al desmontar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (manual) areaRef.current?.select();
  }, [manual]);

  const copiar = async () => {
    try {
      const cb = clipboard === undefined ? globalThis.navigator?.clipboard : clipboard;
      if (!cb) throw new Error("sin portapapeles");
      await cb.writeText(text);
      setManual(false);
      setCopiado(true);
      if (timer.current !== null) cancel(timer.current);
      timer.current = schedule(() => setCopiado(false), COPIADO_MS);
    } catch {
      if (onCopyFail) onCopyFail();
      else setManual(true);
    }
  };

  return (
    <>
      <button type="button" onClick={copiar} aria-label={ariaLabel} className={className}>
        {copiado ? "Copiado" : label}
      </button>
      {manual && (
        <textarea
          ref={areaRef}
          readOnly
          rows={Math.min(8, text.split("\n").length)}
          value={text}
          aria-label="Texto para copiar"
          onFocus={(e) => e.currentTarget.select()}
          className="mt-2 w-full basis-full rounded-lg border border-beige-300 bg-beige-50 p-2 text-sm text-sage-900"
        />
      )}
    </>
  );
}
