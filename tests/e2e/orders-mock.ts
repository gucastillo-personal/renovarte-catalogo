import type { Page, Route } from "@playwright/test";

/**
 * spec 0017, F13 — mock de `renovarte-ordenes` para los e2e. El servicio real
 * todavía no está desplegado: `playwright.config.ts` hornea la URL placeholder
 * `https://ordenes.test` en el bundle (`NEXT_PUBLIC_ORDERS_API_URL`) y
 * `page.route()` contesta ahí.
 *
 * CORS y preflight (medido con `@playwright/test` 1.63): el POST lleva
 * `Content-Type: application/json`, así que el navegador haría un preflight
 * `OPTIONS`, pero con `page.route()` Playwright lo contesta solo: el `OPTIONS`
 * nunca llega al handler (`mock.preflights` queda en 0 y un test lo fija). Aun
 * así el handler responde `204` con los headers `access-control-allow-*` por si
 * una versión futura sí lo entrega, y cada respuesta real lleva
 * `access-control-allow-origin`. Esto NO reemplaza la verificación del CORS del
 * servicio real (tareas B de `renovarte-ordenes`).
 *
 * Tiempo: el cliente espera hasta 3,5 s si el `form_token` es más joven (RFC
 * §6.2). Los tests instalan `page.clock` y llaman a `esperarToken()` para
 * saltear esa espera sin dormir de verdad.
 */

export const ORDERS_URL = "https://ordenes.test";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-max-age": "600",
};

export type Respuesta =
  | { status: number; body: unknown }
  /** Corta la conexión (error de red). */
  | "abort"
  /** No contesta nunca (para el timeout con `page.clock`) hasta que se libere con `release`. */
  | "hang";

export interface CrearBody {
  v: number;
  idempotency_key: string;
  form_token: string;
  lineas: Array<{ producto_id: string; cantidad: number; precio_visto: number }>;
  total_visto: number;
  contacto: { nombre: string; telefono: string };
  sitio_web?: string;
  [k: string]: unknown;
}

export interface OrdersMock {
  posts: CrearBody[];
  /** El POST número `i` (falla si no llegó). */
  post(i: number): CrearBody;
  gets: number;
  preflights: number;
  /** Libera los POST en `hang` con esta respuesta. */
  release(r: Respuesta): void;
}

export const DISPONIBLE = { status: 200, body: { v: 1, resultado: "disponible", form_token: "tok-1" } };
export const aceptada = (numero = "RA-48271", status = 201): Respuesta => ({
  status,
  body: { v: 1, resultado: "aceptada", numero_orden: numero, recibida_en: "2026-10-21T12:00:00Z" },
});
export const falla = (status = 500, codigo = "interno"): Respuesta => ({
  status,
  body: { v: 1, resultado: "falla", codigo },
});
export const invalida = (errores: Array<{ campo: string | null; codigo: string }>): Respuesta => ({
  status: 422,
  body: { v: 1, resultado: "invalida", errores },
});
export const TOPE: Respuesta = { status: 503, body: { v: 1, resultado: "tope_alcanzado" } };

export interface MockOptions {
  /** `GET /v1/estado`. */
  estado?: Respuesta | (() => Respuesta);
  /** `POST /v1/ordenes`, una respuesta por llamada (la última se repite). */
  ordenes?: Respuesta[];
}

async function responder(route: Route, r: Respuesta) {
  if (r === "abort") return route.abort("failed");
  if (r === "hang") return; // lo resuelve `release`
  return route.fulfill({
    status: r.status,
    headers: { ...CORS, "content-type": "application/json" },
    body: JSON.stringify(r.body),
  });
}

export async function mockOrders(page: Page, opts: MockOptions = {}): Promise<OrdersMock> {
  const ordenes = opts.ordenes ?? [aceptada()];
  const hung: Route[] = [];
  const mock: OrdersMock = {
    posts: [],
    post(i) {
      const p = mock.posts[i];
      if (!p) throw new Error(`no hubo un POST #${i}`);
      return p;
    },
    gets: 0,
    preflights: 0,
    release(r) {
      for (const route of hung.splice(0)) void responder(route, r);
    },
  };
  await page.route(`${ORDERS_URL}/**`, async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") {
      mock.preflights++;
      return route.fulfill({ status: 204, headers: CORS });
    }
    if (req.method() === "GET") {
      mock.gets++;
      const e = typeof opts.estado === "function" ? opts.estado() : (opts.estado ?? DISPONIBLE);
      return responder(route, e);
    }
    mock.posts.push(req.postDataJSON() as CrearBody);
    const r = ordenes[Math.min(mock.posts.length - 1, ordenes.length - 1)] ?? aceptada();
    if (r === "hang") hung.push(route);
    return responder(route, r);
  });
  return mock;
}
