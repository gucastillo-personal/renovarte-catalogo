/**
 * Canales de contacto de RenovArte. Única fuente para la confirmación, los
 * banners de falla y los avisos `noscript` (spec 0017).
 */
export const RENOVARTE_EMAIL = "renovartebyjuli@gmail.com";
export const INSTAGRAM_USER = "renovarte_by_juli";
export const INSTAGRAM_DM_URL = `https://ig.me/m/${INSTAGRAM_USER}`;

/** `mailto:` a RenovArte con el asunto "Consulta por orden {numero}". */
export function mailtoConsulta(numero: string): string {
  const asunto = encodeURIComponent(`Consulta por orden ${numero}`);
  return `mailto:${RENOVARTE_EMAIL}?subject=${asunto}`;
}
