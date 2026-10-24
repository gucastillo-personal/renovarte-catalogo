"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { ContactChannels } from "@/components/orders/ContactChannels";
import { CopyButton } from "@/components/orders/CopyButton";
import { formatARS } from "@/lib/format";
import type { Confirmation } from "@/lib/orders/confirmation-store";

const H2 = "font-display text-2xl text-sage-900";

/**
 * Confirmación de la orden (ux.md "Confirmación", AC-10/AC-11): reemplaza el
 * contenido de `/carrito`. El nombre y el teléfono se muestran como texto plano
 * (React los escapa); el nombre corta línea si es largo (`break-words`). El
 * foco va al `h1`.
 */
export function OrderConfirmation({ confirmation }: { confirmation: Confirmation }) {
  const { numero_orden, lineas, total, nombre, telefono } = confirmation;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const numeroRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Si el portapapeles falla, se selecciona el número que ya está en pantalla.
  const seleccionarNumero = () => {
    const node = numeroRef.current;
    const sel = globalThis.getSelection?.();
    if (!node || !sel) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl text-sage-900 focus:outline-none">
        Tu orden fue enviada a RenovArte
      </h1>

      <section className="flex flex-col gap-2 rounded-lg bg-sage-50 p-5">
        <p className="text-xs font-medium uppercase tracking-widest text-sage-700">NÚMERO DE ORDEN</p>
        <p
          ref={numeroRef}
          className="select-all text-4xl font-semibold tabular-nums tracking-wide text-sage-900"
        >
          {numero_orden}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={numero_orden} label="Copiar número" onCopyFail={seleccionarNumero} />
        </div>
        <p className="text-sm text-sage-700">
          Guardalo o sacale una captura: no te vamos a mandar la orden por mail.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={H2}>Qué sigue</h2>
        <p className="text-sage-800">
          RenovArte va a contactar a <span className="break-words font-medium">{nombre}</span> al{" "}
          <span className="break-words">{telefono}</span> para coordinar el pago y el envío. En el sitio
          no se cobra nada.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>¿Tenés una consulta sobre tu orden?</h2>
        <ContactChannels numeroOrden={numero_orden} />
        <p className="text-sm text-sage-700">Mencioná el número {numero_orden} en tu mensaje.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>Lo que pediste</h2>
        <ul aria-label="Lo que pediste" className="flex flex-col border-t border-beige-200">
          {lineas.map((l, i) => (
            <li
              key={`${l.nombre}-${i}`}
              className="flex items-baseline justify-between gap-4 border-b border-beige-200 py-3"
            >
              <span className="min-w-0 text-sage-800">
                {l.nombre}
                {l.presentacion !== "" && <> · {l.presentacion}</>} × {l.cantidad}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-sage-900">
                {formatARS(l.precio * l.cantidad)}
              </span>
            </li>
          ))}
        </ul>
        <p className="flex items-baseline justify-between gap-4 text-sage-800">
          <span>Total</span>
          <span className="text-2xl font-semibold tabular-nums text-sage-900">{formatARS(total)}</span>
        </p>
      </section>

      <Link
        href="/"
        className="self-start rounded-lg bg-sage-500 px-5 py-3 font-medium text-beige-50 transition-colors hover:bg-sage-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
      >
        Volver al catálogo
      </Link>
    </div>
  );
}
