"use client";

import { useEffect, useRef } from "react";

import { AlertIcon } from "@/components/orders/AlertIcon";
import { ContactChannels } from "@/components/orders/ContactChannels";
import { CopyButton } from "@/components/orders/CopyButton";

export type SendBannerVariant = "falla" | "tope" | "tope-entrada" | "general";

export const TITULO_NO_ENVIADA = "Tu orden no se envió";
export const TITULO_TOPE_ENTRADA = "Por ahora no podemos recibir órdenes desde el sitio";

const CUERPO_FALLA =
  "No pudimos comunicarnos con RenovArte. Tu carrito y tus datos siguen acá: podés intentar de nuevo.";
const CANALES_FALLA = "Si sigue sin funcionar, podés hacer el pedido por teléfono, email o Instagram:";
const CUERPO_TOPE =
  "Este mes llegamos al límite de órdenes que podemos recibir desde el sitio. Tu carrito sigue guardado. Mientras tanto, podés hacer tu pedido por teléfono, por email o por mensaje directo en Instagram:";
const CUERPO_GENERAL =
  "Algo de lo que enviaste no pasó la revisión. Mirá que tu carrito y tus datos estén bien y volvé a tocar «Enviar orden». Si sigue sin funcionar, podés hacer el pedido por teléfono, por email o por mensaje directo en Instagram:";
export const NOTA_DETALLE = "Para pegarlo en tu mensaje.";

export interface OrderSendBannerProps {
  variant: SendBannerVariant;
  /** Texto de "Copiar detalle del pedido" (`orderText`, sin nombre ni teléfono). */
  detalle: string;
  /** Solo la variante `falla` tiene "Reintentar envío". */
  onRetry?(): void;
}

/**
 * Banner de "orden no enviada" (ux.md "Estados y responsividad"):
 * - `falla` / `tope` / `general`: `role="alert"` y el foco va al contenedor
 *   (`tabindex="-1"`), porque es el resultado directo del envío.
 * - `tope-entrada`: `role="status"` y **sin mover el foco** (no responde a una
 *   acción del visitante).
 * Solo `falla` ofrece "Reintentar envío".
 */
export function OrderSendBanner({ variant, detalle, onRetry }: OrderSendBannerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const alerta = variant !== "tope-entrada";

  useEffect(() => {
    if (alerta) ref.current?.focus();
  }, [alerta]);

  const titulo = variant === "tope-entrada" ? TITULO_TOPE_ENTRADA : TITULO_NO_ENVIADA;
  const cuerpo =
    variant === "falla" ? CUERPO_FALLA : variant === "general" ? CUERPO_GENERAL : CUERPO_TOPE;
  const tope = variant === "tope" || variant === "tope-entrada";

  return (
    <div
      ref={ref}
      role={alerta ? "alert" : "status"}
      tabIndex={alerta ? -1 : undefined}
      className="flex flex-col gap-3 rounded-lg border-[1.5px] border-sage-700 bg-beige-50 p-3 text-sage-800 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
    >
      <p className="flex items-center gap-2 font-semibold">
        <AlertIcon />
        {titulo}
      </p>
      <p className="text-sm">{cuerpo}</p>
      {variant === "falla" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start rounded-lg bg-sage-500 px-4 py-2 font-medium text-beige-50 transition-colors hover:bg-sage-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
        >
          Reintentar envío
        </button>
      )}
      {variant === "falla" && <p className="text-sm">{CANALES_FALLA}</p>}
      <div className="text-sm">
        <ContactChannels />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <CopyButton text={detalle} label="Copiar detalle del pedido" />
        {tope && <span className="text-sage-700">{NOTA_DETALLE}</span>}
      </div>
    </div>
  );
}
