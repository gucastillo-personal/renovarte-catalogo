/**
 * Claves de foco del carrito (ux.md "Interacción" y "Accesibilidad": el foco
 * nunca queda en `body`). Los controles las llevan en `data-cart-focus` y
 * `CartView` enfoca el que corresponda después del siguiente render, porque el
 * botón que tenía el foco puede haberse deshabilitado o desmontado.
 */
export type CartFocusKey =
  | "heading"
  | "undo"
  | "clear"
  | "clear-cancel"
  | `menos:${string}`
  | `mas:${string}`
  | `quitar:${string}`;

export const FOCUS_ATTR = "data-cart-focus";
