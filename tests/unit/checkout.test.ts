import { describe, expect, it } from "vitest";

import type { CartLine } from "@/lib/cart/model";
import {
  ENVIO_EN_CURSO_KEY,
  INITIAL_STATE,
  TOKEN_ESPERA_MIN_MS,
  TOKEN_RENOVAR_MS,
  checkoutReducer,
  createCheckout,
  huella,
  type Checkout,
  type SubmitInput,
} from "@/lib/orders/checkout";
import type { OrdersClientPorts } from "@/lib/orders/client";

// spec 0017, F11 — máquina de envío (AC-15, AC-19, AC-24, plan.md decisiones 6 y 7).

const BASE = "https://ordenes.test";
const T0 = 1_000_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const ACEPTADA = {
  v: 1,
  resultado: "aceptada",
  numero_orden: "RA-48271",
  recibida_en: "2026-10-05T12:00:00Z",
};
const TOKEN_VENCIDO = {
  v: 1,
  resultado: "invalida",
  errores: [{ campo: "form_token", codigo: "token_vencido" }],
};

interface PostCall {
  at: number;
  body: Record<string, unknown> & { idempotency_key: string; form_token: string };
}

class FakeStorage {
  data = new Map<string, string>();
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => void this.data.set(k, v);
  removeItem = (k: string) => void this.data.delete(k);
}

type Timer = { at: number; fn: () => void; cancelled: boolean };

function setup(options: { storage?: FakeStorage | null } = {}) {
  let now = T0;
  const timers: Timer[] = [];
  const posts: PostCall[] = [];
  const gets: number[] = [];
  const storage = options.storage === undefined ? new FakeStorage() : options.storage;
  const inFlightSnapshots: Array<string | null> = [];
  let tokenSeq = 0;
  // Cola de respuestas del POST; si se agota, 201 aceptada.
  const postResponses: Array<() => Response> = [];
  let estado: () => Response = () => json({ v: 1, resultado: "disponible", form_token: `tok-${++tokenSeq}` });
  let uuidSeq = 0;

  const ports: OrdersClientPorts = {
    fetch: async (url, init) => {
      if (init.method === "GET") {
        gets.push(now);
        return estado();
      }
      posts.push({ at: now, body: JSON.parse(init.body as string) });
      inFlightSnapshots.push(storage ? storage.getItem(ENVIO_EN_CURSO_KEY) : null);
      return (postResponses.shift() ?? (() => json(ACEPTADA, 201)))();
    },
    now: () => now,
    schedule: (fn, ms) => {
      const t: Timer = { at: now + ms, fn, cancelled: false };
      timers.push(t);
      return t as unknown as ReturnType<typeof setTimeout>;
    },
    cancel: (h) => {
      (h as unknown as Timer).cancelled = true;
    },
    baseUrl: BASE,
  };

  const checkout: Checkout = createCheckout({
    ports,
    randomUUID: () => `00000000-0000-4000-8000-${String(++uuidSeq).padStart(12, "0")}`,
    storage,
  });

  const flush = () => new Promise<void>((r) => globalThis.setTimeout(r, 0));

  /** Hace correr el reloj fake de a 100 ms hasta que la promesa termina. */
  async function drive<T>(p: Promise<T>): Promise<T> {
    let done = false;
    void p.then(
      () => (done = true),
      () => (done = true),
    );
    for (let i = 0; i < 400 && !done; i++) {
      await flush();
      if (done) break;
      now += 100;
      for (const t of timers) {
        if (!t.cancelled && t.at <= now) {
          t.cancelled = true;
          t.fn();
        }
      }
    }
    return p;
  }

  return {
    checkout,
    posts,
    gets,
    storage,
    inFlightSnapshots,
    drive,
    flush,
    advance: (ms: number) => void (now += ms),
    getNow: () => now,
    respondPost: (...rs: Array<() => Response>) => postResponses.push(...rs),
    setEstado: (fn: () => Response) => void (estado = fn),
  };
}

function line(id: string, extra: Partial<CartLine> = {}): CartLine {
  return {
    producto_id: id,
    cantidad: 2,
    precio_visto: 1000,
    nombre: `Producto ${id}`,
    presentacion: "100 ml",
    imagen: `/img/${id}.svg`,
    ...extra,
  };
}

const base: SubmitInput = {
  lines: [line("a"), line("b", { cantidad: 1, precio_visto: 500 })],
  nombre: "Ana Pérez",
  telefono: "11 5555 5555",
};

describe("huella", () => {
  it('"Ana  Pérez" y "Ana Pérez" → misma huella', () => {
    expect(huella({ ...base, nombre: "Ana  Pérez" })).toBe(huella(base));
    expect(huella({ ...base, nombre: "  Ana Pérez " })).toBe(huella(base));
  });

  it("cambia con el nombre, el teléfono, la cantidad, el precio o las líneas", () => {
    const h = huella(base);
    expect(huella({ ...base, nombre: "Ana Pérezz" })).not.toBe(h);
    expect(huella({ ...base, telefono: "11 5555 5556" })).not.toBe(h);
    expect(huella({ ...base, lines: [line("a", { cantidad: 3 }), base.lines[1]!] })).not.toBe(h);
    expect(huella({ ...base, lines: [line("a", { precio_visto: 1100 }), base.lines[1]!] })).not.toBe(h);
    expect(huella({ ...base, lines: [base.lines[0]!] })).not.toBe(h);
  });

  it("las líneas no disponibles no cuentan (no viajan)", () => {
    expect(huella({ ...base, lines: [...base.lines, line("z", { no_disponible: true })] })).toBe(huella(base));
  });

  it("es un hash: no contiene el nombre ni el teléfono", () => {
    const h = huella({ ...base, nombre: "CanarioNombre", telefono: "1122334455" });
    expect(h).toMatch(/^[0-9a-f]+$/);
    expect(h).not.toContain("Canario");
    expect(h).not.toContain("1122334455");
  });
});

describe("checkoutReducer", () => {
  it("SUBMIT durante enviando devuelve el mismo estado", () => {
    const enviando = checkoutReducer(INITIAL_STATE, { type: "SUBMIT" });
    expect(enviando).toEqual({ status: "enviando" });
    expect(checkoutReducer(enviando, { type: "SUBMIT" })).toBe(enviando);
  });

  it("RESOLVE solo vale sobre enviando; EDIT vuelve a editar (salvo enviando)", () => {
    const res = { status: "fallida" } as const;
    expect(checkoutReducer(INITIAL_STATE, { type: "RESOLVE", resolucion: res })).toBe(INITIAL_STATE);
    const enviando = checkoutReducer(INITIAL_STATE, { type: "SUBMIT" });
    const fallida = checkoutReducer(enviando, { type: "RESOLVE", resolucion: res });
    expect(fallida).toEqual({ status: "fallida" });
    expect(checkoutReducer(fallida, { type: "EDIT" })).toEqual({ status: "editando" });
    expect(checkoutReducer(enviando, { type: "EDIT" })).toBe(enviando);
  });
});

describe("envío: camino feliz y estados", () => {
  it("sin token pide uno, espera 3,5 s desde su emisión y manda el POST con el form_token del GET", async () => {
    const s = setup();
    const out = await s.drive(s.checkout.submit(base));
    expect(out).toEqual({
      status: "confirmada",
      numero_orden: "RA-48271",
      recibida_en: "2026-10-05T12:00:00Z",
    });
    expect(s.gets).toEqual([T0]);
    expect(s.posts).toHaveLength(1);
    expect(s.posts[0]!.at - T0).toBeGreaterThanOrEqual(TOKEN_ESPERA_MIN_MS);
    expect(s.posts[0]!.body.form_token).toBe("tok-1");
  });

  it("un token con menos de 3,5 s espera lo que falta (no más)", async () => {
    const s = setup();
    s.checkout.adoptToken("recien", T0 - 1000);
    await s.drive(s.checkout.submit(base));
    expect(s.gets).toHaveLength(0);
    expect(s.posts[0]!.body.form_token).toBe("recien");
    expect(s.posts[0]!.at - T0).toBeGreaterThanOrEqual(TOKEN_ESPERA_MIN_MS - 1000);
    expect(s.posts[0]!.at - T0).toBeLessThan(TOKEN_ESPERA_MIN_MS);
  });

  it("un token con más de 3,5 s no espera", async () => {
    const s = setup();
    s.checkout.adoptToken("viejo", T0 - 60_000);
    await s.drive(s.checkout.submit(base));
    expect(s.posts[0]!.at).toBe(T0); // sin espera: el POST sale en el mismo instante
    expect(s.gets).toHaveLength(0);
  });

  it("un token con más de 1 h 50 min se renueva antes de enviar", async () => {
    const s = setup();
    s.checkout.adoptToken("vencido", T0 - TOKEN_RENOVAR_MS - 1);
    await s.drive(s.checkout.submit(base));
    expect(s.gets).toHaveLength(1);
    expect(s.posts[0]!.body.form_token).toBe("tok-1");
    expect(s.posts[0]!.at - T0).toBeGreaterThanOrEqual(TOKEN_ESPERA_MIN_MS);
  });

  it("un token con menos de 1 h 50 min se reusa", async () => {
    const s = setup();
    s.checkout.adoptToken("vigente", T0 - TOKEN_RENOVAR_MS + 60_000);
    await s.drive(s.checkout.submit(base));
    expect(s.gets).toHaveLength(0);
    expect(s.posts[0]!.body.form_token).toBe("vigente");
  });

  it("GET tope_alcanzado al renovar → tope, sin POST", async () => {
    const s = setup();
    s.setEstado(() => json({ v: 1, resultado: "tope_alcanzado" }));
    expect(await s.drive(s.checkout.submit(base))).toEqual({ status: "tope" });
    expect(s.posts).toHaveLength(0);
  });

  it("GET no_disponible o caído al renovar → falla genérica, sin POST", async () => {
    for (const estado of [
      () => json({ v: 1, resultado: "no_disponible" }),
      () => new Response("", { status: 500 }),
    ]) {
      const s = setup();
      s.setEstado(estado);
      expect(await s.drive(s.checkout.submit(base))).toEqual({ status: "fallida" });
      expect(s.posts).toHaveLength(0);
    }
  });

  it("cada resultado del POST", async () => {
    const casos: Array<[() => Response, unknown]> = [
      [() => json({ v: 1, resultado: "tope_alcanzado" }, 503), { status: "tope" }],
      [() => json({ v: 1, resultado: "falla", codigo: "en_proceso" }, 503), { status: "fallida" }],
      [() => new Response("", { status: 502 }), { status: "fallida" }],
      [
        () => json({ v: 1, resultado: "rechazada_por_catalogo", lineas: [], total_vigente: 0 }, 409),
        { status: "rechazada_por_catalogo", lineas: [], total_vigente: 0 },
      ],
    ];
    for (const [resp, esperado] of casos) {
      const s = setup();
      s.respondPost(resp);
      expect(await s.drive(s.checkout.submit(base))).toEqual(esperado);
    }
  });

  it("invalida con campos del contacto → errores por campo, no general", async () => {
    const s = setup();
    s.respondPost(() =>
      json(
        {
          v: 1,
          resultado: "invalida",
          errores: [
            { campo: "contacto.telefono", codigo: "formato" },
            { campo: "contacto.nombre", codigo: "largo" },
          ],
        },
        422,
      ),
    );
    expect(await s.drive(s.checkout.submit(base))).toEqual({
      status: "invalida",
      general: false,
      errores: [
        { campo: "nombre", codigo: "formato" },
        { campo: "telefono", codigo: "formato" },
      ],
    });
  });
});

describe("doble envío (AC-24)", () => {
  it("dos submit seguidos → un solo envío", async () => {
    const s = setup();
    const a = s.checkout.submit(base);
    const b = s.checkout.submit(base);
    expect(await b).toBeNull();
    expect(s.checkout.getState()).toEqual({ status: "enviando" });
    expect((await s.drive(a))?.status).toBe("confirmada");
    expect(s.posts).toHaveLength(1);
    expect(s.gets).toHaveLength(1);
  });

  it("durante enviando, un submit con otros datos tampoco hace nada", async () => {
    const s = setup();
    const a = s.checkout.submit(base);
    expect(await s.checkout.submit({ ...base, nombre: "Otra Persona" })).toBeNull();
    await s.drive(a);
    expect(s.posts).toHaveLength(1);
    expect((s.posts[0]!.body.contacto as { nombre: string }).nombre).toBe("Ana Pérez");
  });

  it("después de terminar se puede volver a enviar", async () => {
    const s = setup();
    s.respondPost(() => new Response("", { status: 500 }));
    await s.drive(s.checkout.submit(base));
    expect((await s.drive(s.checkout.submit(base)))?.status).toBe("confirmada");
    expect(s.posts).toHaveLength(2);
  });

  it("notifica a los suscriptores: enviando y el resultado", async () => {
    const s = setup();
    const vistos: string[] = [];
    const off = s.checkout.subscribe(() => vistos.push(s.checkout.getState().status));
    await s.drive(s.checkout.submit(base));
    off();
    expect(vistos).toEqual(["enviando", "confirmada"]);
  });
});

describe("idempotency_key", () => {
  it('"Reintentar" sin cambios (tras una falla) reusa la key', async () => {
    const s = setup();
    s.respondPost(() => new Response("", { status: 500 }));
    await s.drive(s.checkout.submit(base));
    await s.drive(s.checkout.submit(base));
    expect(s.posts).toHaveLength(2);
    expect(s.posts[1]!.body.idempotency_key).toBe(s.posts[0]!.body.idempotency_key);
  });

  it('"Ana  Pérez" y "Ana Pérez" → misma key, y el body lleva el mismo nombre normalizado', async () => {
    const s = setup();
    s.respondPost(() => new Response("", { status: 500 }));
    await s.drive(s.checkout.submit(base));
    await s.drive(s.checkout.submit({ ...base, nombre: "Ana  Pérez" }));
    expect(s.posts[1]!.body.idempotency_key).toBe(s.posts[0]!.body.idempotency_key);
    expect(s.posts[1]!.body.contacto).toEqual(s.posts[0]!.body.contacto);
  });

  it("cambiar solo el nombre → key nueva", async () => {
    const s = setup();
    s.respondPost(() => new Response("", { status: 500 }));
    await s.drive(s.checkout.submit(base));
    await s.drive(s.checkout.submit({ ...base, nombre: "Ana Pérez Gómez" }));
    expect(s.posts[1]!.body.idempotency_key).not.toBe(s.posts[0]!.body.idempotency_key);
  });

  it("cambiar solo el teléfono → key nueva", async () => {
    const s = setup();
    s.respondPost(() => new Response("", { status: 500 }));
    await s.drive(s.checkout.submit(base));
    await s.drive(s.checkout.submit({ ...base, telefono: "11 5555 5556" }));
    expect(s.posts[1]!.body.idempotency_key).not.toBe(s.posts[0]!.body.idempotency_key);
  });

  it("cambiar una cantidad → key nueva", async () => {
    const s = setup();
    s.respondPost(() => new Response("", { status: 500 }));
    await s.drive(s.checkout.submit(base));
    await s.drive(s.checkout.submit({ ...base, lines: [line("a", { cantidad: 5 }), base.lines[1]!] }));
    expect(s.posts[1]!.body.idempotency_key).not.toBe(s.posts[0]!.body.idempotency_key);
  });

  it("nunca se manda la misma key con otro nombre ni con otro teléfono", async () => {
    const s = setup();
    const variantes: SubmitInput[] = [
      base,
      { ...base, nombre: "Beto" + " Díaz" },
      { ...base, telefono: "4444 4444" },
      { ...base, nombre: "Ana Pérez", telefono: "11 5555 5555" },
      { ...base, nombre: "Carla Ruiz", telefono: "11 5555 5555" },
    ];
    for (const v of variantes) {
      s.respondPost(() => new Response("", { status: 500 }));
      await s.drive(s.checkout.submit(v));
    }
    const porKey = new Map<string, Set<string>>();
    for (const p of s.posts) {
      const k = p.body.idempotency_key;
      const c = JSON.stringify(p.body.contacto);
      porKey.set(k, (porKey.get(k) ?? new Set()).add(c));
    }
    for (const contactos of porKey.values()) expect(contactos.size).toBe(1);
  });

  it("tras rechazada_por_catalogo el siguiente envío (aun igual) usa key nueva", async () => {
    const s = setup();
    s.respondPost(() =>
      json({ v: 1, resultado: "rechazada_por_catalogo", lineas: [], total_vigente: 0 }, 409),
    );
    await s.drive(s.checkout.submit(base));
    await s.drive(s.checkout.submit(base));
    expect(s.posts[1]!.body.idempotency_key).not.toBe(s.posts[0]!.body.idempotency_key);
  });

  it("tras un invalida general (errores: [], lineas, null) el siguiente envío usa key nueva", async () => {
    for (const errores of [
      [],
      [{ campo: "lineas", codigo: "formato" }],
      [{ campo: null, codigo: "no_permitido" }],
    ]) {
      const s = setup();
      s.respondPost(() => json({ v: 1, resultado: "invalida", errores }, 422));
      const out = await s.drive(s.checkout.submit(base));
      expect(out).toEqual({ status: "invalida", errores: [], general: true });
      await s.drive(s.checkout.submit(base));
      expect(s.posts[1]!.body.idempotency_key).not.toBe(s.posts[0]!.body.idempotency_key);
    }
  });

  it("tras un invalida de campo, sin cambios, la key se reusa (el cliente igual lo bloquea antes)", async () => {
    const s = setup();
    s.respondPost(() =>
      json({ v: 1, resultado: "invalida", errores: [{ campo: "contacto.nombre", codigo: "formato" }] }, 422),
    );
    await s.drive(s.checkout.submit(base));
    await s.drive(s.checkout.submit(base));
    expect(s.posts[1]!.body.idempotency_key).toBe(s.posts[0]!.body.idempotency_key);
  });

  it("después de aceptada, un envío nuevo usa key nueva", async () => {
    const s = setup();
    await s.drive(s.checkout.submit(base));
    await s.drive(s.checkout.submit(base));
    expect(s.posts[1]!.body.idempotency_key).not.toBe(s.posts[0]!.body.idempotency_key);
  });

  it("la key es un UUID por envío distinto (randomUUID inyectado)", async () => {
    const s = setup();
    await s.drive(s.checkout.submit(base));
    expect(s.posts[0]!.body.idempotency_key).toBe("00000000-0000-4000-8000-000000000001");
  });
});

describe("token_vencido: un solo reintento silencioso (RFC §6.2)", () => {
  it("vencido o prematuro → token nuevo, espera mínima y reintento con la misma key", async () => {
    const s = setup();
    s.respondPost(
      () => json(TOKEN_VENCIDO, 422),
      () => json(ACEPTADA, 200),
    );
    const out = await s.drive(s.checkout.submit(base));
    expect(out?.status).toBe("confirmada");
    expect(s.posts).toHaveLength(2);
    expect(s.posts[1]!.body.idempotency_key).toBe(s.posts[0]!.body.idempotency_key);
    expect(s.posts[0]!.body.form_token).toBe("tok-1");
    expect(s.posts[1]!.body.form_token).toBe("tok-2");
    expect(s.gets).toHaveLength(2);
    // El segundo token también espera 3,5 s desde su emisión.
    expect(s.posts[1]!.at - s.gets[1]!).toBeGreaterThanOrEqual(TOKEN_ESPERA_MIN_MS);
  });

  it("el estado nunca pasó por invalida: el visitante no ve nada", async () => {
    const s = setup();
    s.respondPost(
      () => json(TOKEN_VENCIDO, 422),
      () => json(ACEPTADA, 200),
    );
    const vistos: string[] = [];
    s.checkout.subscribe(() => vistos.push(s.checkout.getState().status));
    await s.drive(s.checkout.submit(base));
    expect(vistos).toEqual(["enviando", "confirmada"]);
  });

  it("un segundo token_vencido → falla genérica (y la key se conserva para Reintentar)", async () => {
    const s = setup();
    s.respondPost(
      () => json(TOKEN_VENCIDO, 422),
      () => json(TOKEN_VENCIDO, 422),
    );
    expect(await s.drive(s.checkout.submit(base))).toEqual({ status: "fallida" });
    expect(s.posts).toHaveLength(2);
    await s.drive(s.checkout.submit(base));
    expect(s.posts[2]!.body.idempotency_key).toBe(s.posts[0]!.body.idempotency_key);
  });

  it("si el GET del token nuevo falla → falla genérica", async () => {
    const s = setup();
    s.respondPost(() => json(TOKEN_VENCIDO, 422));
    let n = 0;
    s.setEstado(() =>
      ++n === 1 ? json({ v: 1, resultado: "disponible", form_token: "tok-1" }) : new Response("", { status: 500 }),
    );
    expect(await s.drive(s.checkout.submit(base))).toEqual({ status: "fallida" });
    expect(s.posts).toHaveLength(1);
  });
});

describe("sessionStorage del envío en curso (AC-24, AC-28)", () => {
  it("guarda key y huella (hash) mientras envía y lo borra al terminar", async () => {
    const s = setup();
    const nombre = "CanarioNombre Apellido";
    const telefono = "1122334455";
    await s.drive(s.checkout.submit({ ...base, nombre, telefono }));
    expect(s.inFlightSnapshots).toHaveLength(1);
    const guardado = s.inFlightSnapshots[0]!;
    expect(guardado).not.toBeNull();
    const parsed = JSON.parse(guardado);
    expect(Object.keys(parsed).sort()).toEqual(["huella", "idempotency_key"]);
    expect(parsed.idempotency_key).toBe(s.posts[0]!.body.idempotency_key);
    expect(parsed.huella).toBe(huella({ ...base, nombre, telefono }));
    expect(guardado).not.toContain("Canario");
    expect(guardado).not.toContain(telefono);
    expect(s.storage!.getItem(ENVIO_EN_CURSO_KEY)).toBeNull();
  });

  it("también se borra tras una falla", async () => {
    const s = setup();
    s.respondPost(() => new Response("", { status: 500 }));
    await s.drive(s.checkout.submit(base));
    expect(s.storage!.getItem(ENVIO_EN_CURSO_KEY)).toBeNull();
  });

  it("tras una recarga durante el envío, la key guardada se reusa con la misma huella", async () => {
    const storage = new FakeStorage();
    storage.setItem(
      ENVIO_EN_CURSO_KEY,
      JSON.stringify({ idempotency_key: "key-de-antes", huella: huella(base) }),
    );
    const s = setup({ storage });
    await s.drive(s.checkout.submit(base));
    expect(s.posts[0]!.body.idempotency_key).toBe("key-de-antes");
  });

  it("con otra huella, la key guardada no se reusa", async () => {
    const storage = new FakeStorage();
    storage.setItem(
      ENVIO_EN_CURSO_KEY,
      JSON.stringify({ idempotency_key: "key-de-antes", huella: huella(base) }),
    );
    const s = setup({ storage });
    await s.drive(s.checkout.submit({ ...base, nombre: "Otra Persona" }));
    expect(s.posts[0]!.body.idempotency_key).not.toBe("key-de-antes");
  });

  it("JSON corrupto o con forma rara → nada; sin storage anda igual", async () => {
    for (const raw of ["{no", "[]", '{"idempotency_key":1,"huella":"x"}', "null"]) {
      const storage = new FakeStorage();
      storage.setItem(ENVIO_EN_CURSO_KEY, raw);
      const s = setup({ storage });
      await s.drive(s.checkout.submit(base));
      expect(s.posts[0]!.body.idempotency_key).toMatch(/^00000000-/);
    }
    const s = setup({ storage: null });
    expect((await s.drive(s.checkout.submit(base)))?.status).toBe("confirmada");
  });
});

describe("edit", () => {
  it("vuelve a editando después de un resultado", async () => {
    const s = setup();
    s.respondPost(() => new Response("", { status: 500 }));
    await s.drive(s.checkout.submit(base));
    expect(s.checkout.getState().status).toBe("fallida");
    s.checkout.edit();
    expect(s.checkout.getState()).toEqual({ status: "editando" });
  });
});
