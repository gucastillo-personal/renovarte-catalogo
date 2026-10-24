import { CopyButton } from "@/components/orders/CopyButton";
import {
  INSTAGRAM_DM_URL,
  INSTAGRAM_USER,
  RENOVARTE_EMAIL,
  RENOVARTE_TELEFONO,
  mailtoConsulta,
  telefonoHref,
  whatsappHref,
} from "@/lib/contact";

export interface ContactChannelsProps {
  /** Si hay número de orden, el `mailto:` lleva el asunto "Consulta por orden {número}". */
  numeroOrden?: string;
}

const LINK =
  "rounded font-medium text-sage-800 underline underline-offset-4 hover:text-sage-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500";

/**
 * Canales de RenovArte (ux.md "Confirmación", punto 4; banners de envío):
 * teléfono (`tel:` + WhatsApp + "Copiar"), email (`mailto:` + "Copiar") e
 * Instagram por mensaje directo (`target="_blank" rel="noopener"`). Única
 * fuente de la confirmación y de los banners.
 */
export function ContactChannels({ numeroOrden }: ContactChannelsProps) {
  const mailto = numeroOrden ? mailtoConsulta(numeroOrden) : `mailto:${RENOVARTE_EMAIL}`;
  return (
    <ul className="flex flex-col gap-3">
      <li className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sage-700">Teléfono</span>
        <a href={telefonoHref()} className={LINK}>
          {RENOVARTE_TELEFONO}
        </a>
        <a href={whatsappHref()} target="_blank" rel="noopener" className={LINK}>
          WhatsApp
        </a>
        <CopyButton text={RENOVARTE_TELEFONO} ariaLabel="Copiar teléfono" />
      </li>
      <li className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sage-700">Email</span>
        <a href={mailto} className={`break-all ${LINK}`}>
          {RENOVARTE_EMAIL}
        </a>
        <CopyButton text={RENOVARTE_EMAIL} ariaLabel="Copiar email" />
      </li>
      <li className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sage-700">Instagram</span>
        <a href={INSTAGRAM_DM_URL} target="_blank" rel="noopener" className={LINK}>
          @{INSTAGRAM_USER}
        </a>
      </li>
    </ul>
  );
}
