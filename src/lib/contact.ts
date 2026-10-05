/**
 * Canales de contacto de RenovArte. Única fuente para la confirmación, los
 * banners de falla y los avisos `noscript` (spec 0017).
 */
export const RENOVARTE_EMAIL = "renovartebyjuli@gmail.com";
/** Teléfono de RenovArte para coordinar pago y envío (enmienda 2026-10-05). */
export const RENOVARTE_TELEFONO = "1130579528";
export const INSTAGRAM_USER = "renovarte_by_juli";
export const INSTAGRAM_DM_URL = `https://ig.me/m/${INSTAGRAM_USER}`;

/** `tel:` para llamar a RenovArte. */
export function telefonoHref(): string {
  return `tel:${RENOVARTE_TELEFONO}`;
}

/** `mailto:` a RenovArte con el asunto "Consulta por orden {numero}". */
export function mailtoConsulta(numero: string): string {
  const asunto = encodeURIComponent(`Consulta por orden ${numero}`);
  return `mailto:${RENOVARTE_EMAIL}?subject=${asunto}`;
}
