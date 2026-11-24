import { describe, expect, it } from "vitest";

import type { CartLine } from "@/lib/cart/model";
import {
  TIMEOUT_MS,
  buildCrearOrdenRequest,
  crearOrden,
  defaultPorts,
  fetchEstado,
  type OrdersClientPorts,
} from "@/lib/orders/client";
import { MAX_LINEAS, type CrearOrdenRequest } from "@/lib/orders/wire";

// spec 0017, F10 — cliente de órdenes (RFC §3, AC-17, AC-20, AC-22).

const BASE = "https://ordenes.test/";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

interface Harness {
  ports: OrdersClientPorts;
  calls: Array<{ url: string; init: RequestInit }>;
  timers: Array<{ fn: () => void; ms: number; cancelled: boolean }>;
}

function harness(
  respond: (url: string, init: RequestInit) => Promise<Response> | Response,
  baseUrl: string | null = BASE,
): Harness {
  const calls: Harness["calls"] = [];
  const timers: Harness["timers"] = [];
  const ports: OrdersClientPorts = {
    fetch: async (url, init) => {
      calls.push({ url, init });
      return respond(url, init);
    },
    now: () => 1_000,
    schedule: (fn, ms) => {
      const t = { fn, ms, cancelled: false };
      timers.push(t);
      return t as unknown as ReturnType<typeof setTimeout>;
    },
    cancel: (h) => {
      (h as unknown as { cancelled: boolean }).cancelled = true;
    },
    baseUrl: baseUrl ?? undefined,
  };
  return { ports, calls, timers };
}

const body: CrearOrdenRequest = buildCrearOrdenRequest({
  idempotency_key: "11111111-1111-4111-8111-111111111111",
  form_token: "tok",
  lines: [],
  nombre: "Ana Pérez",
  telefono: "11 5555 5555",
});

const ACEPTADA = {
  v: 1,
  resultado: "aceptada",
  numero_orden: "RA-48271",
  recibida_en: "2026-10-05T12:00:00Z",
};

describe("crearOrden: cada resultado", () => {
  it("aceptada (201 y 200)", async () => {
    for (const status of [201, 200]) {
      const h = harness(() => json(ACEPTADA, status));
      expect(await crearOrden(h.ports, body)).toEqual({
        kind: "aceptada",
        numero_orden: "RA-48271",
        recibida_en: "2026-10-05T12:00:00Z",
      });
    }
  });

  it("rechazada_por_catalogo", async () => {
    const lineas = [
      { producto_id: "a", estado: "precio_cambiado", precio_vigente: 100 },
      { producto_id: "b", estado: "no_disponible" },
    ];
    const h = harness(() =>
      json({ v: 1, resultado: "rechazada_por_catalogo", lineas, total_vigente: 100 }, 409),
    );
    expect(await crearOrden(h.ports, body)).toEqual({
      kind: "rechazada_por_catalogo",
      lineas,
      total_vigente: 100,
    });
  });

  it("invalida, con y sin errores", async () => {
    const errores = [{ campo: "contacto.nombre", codigo: "formato" }];
    expect(
      await crearOrden(harness(() => json({ v: 1, resultado: "invalida", errores }, 422)).ports, body),
    ).toEqual({ kind: "invalida", errores });
    expect(
      await crearOrden(harness(() => json({ v: 1, resultado: "invalida", errores: [] }, 422)).ports, body),
    ).toEqual({ kind: "invalida", errores: [] });
  });

  it("tope_alcanzado", async () => {
    const h = harness(() => json({ v: 1, resultado: "tope_alcanzado" }, 503));
    expect(await crearOrden(h.ports, body)).toEqual({ kind: "tope_alcanzado" });
  });

  it("falla, con cualquier código (flood y en_proceso incluidos)", async () => {
    for (const codigo of ["mantenimiento", "en_proceso", "limite_frecuencia", "interno"]) {
      const h = harness(() => json({ v: 1, resultado: "falla", codigo }, 503));
      expect(await crearOrden(h.ports, body)).toEqual({ kind: "falla" });
    }
  });
});

describe("crearOrden: todo lo raro es falla, nunca aceptada (AC-20)", () => {
  it("500 sin body", async () => {
    expect(await crearOrden(harness(() => new Response(null, { status: 500 })).ports, body)).toEqual({
      kind: "falla",
    });
  });

  it("502 sin body", async () => {
    expect(await crearOrden(harness(() => new Response("", { status: 502 })).ports, body)).toEqual({
      kind: "falla",
    });
  });

  it("500 con un JSON que no es del contrato", async () => {
    expect(await crearOrden(harness(() => json({ message: "Internal" }, 500)).ports, body)).toEqual({
      kind: "falla",
    });
  });

  it("JSON inválido", async () => {
    expect(await crearOrden(harness(() => new Response("{no json", { status: 200 })).ports, body)).toEqual({
      kind: "falla",
    });
  });

  it("resultado desconocido", async () => {
    expect(await crearOrden(harness(() => json({ v: 1, resultado: "ok" }, 200)).ports, body)).toEqual({
      kind: "falla",
    });
  });

  it("aceptada sin numero_orden", async () => {
    const mal = { v: 1, resultado: "aceptada", recibida_en: "x" };
    expect(await crearOrden(harness(() => json(mal, 201)).ports, body)).toEqual({ kind: "falla" });
    expect(
      await crearOrden(harness(() => json({ ...ACEPTADA, numero_orden: "" }, 201)).ports, body),
    ).toEqual({ kind: "falla" });
  });

  it("aceptada con un status que no es 200/201", async () => {
    expect(await crearOrden(harness(() => json(ACEPTADA, 500)).ports, body)).toEqual({ kind: "falla" });
    expect(await crearOrden(harness(() => json(ACEPTADA, 202)).ports, body)).toEqual({ kind: "falla" });
  });

  it("error de red", async () => {
    const h = harness(() => Promise.reject(new TypeError("Failed to fetch")));
    expect(await crearOrden(h.ports, body)).toEqual({ kind: "falla" });
  });

  it("timeout de 15 s (timer fake)", async () => {
    const h = harness(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const pending = crearOrden(h.ports, body);
    expect(h.timers).toHaveLength(1);
    expect(h.timers[0]!.ms).toBe(TIMEOUT_MS);
    expect(TIMEOUT_MS).toBe(15_000);
    h.timers[0]!.fn();
    expect(await pending).toEqual({ kind: "falla" });
    expect(h.timers[0]!.cancelled).toBe(true);
  });

  it("URL sin configurar: falla sin tocar la red", async () => {
    for (const baseUrl of [null, ""]) {
      const h = harness(() => json(ACEPTADA, 201), baseUrl);
      expect(await crearOrden(h.ports, body)).toEqual({ kind: "falla" });
      expect(h.calls).toHaveLength(0);
    }
  });

  it("cancela el timer cuando la respuesta llega", async () => {
    const h = harness(() => json(ACEPTADA, 201));
    await crearOrden(h.ports, body);
    expect(h.timers[0]!.cancelled).toBe(true);
  });
});

describe("crearOrden: request", () => {
  it("POST JSON a /v1/ordenes, sin doble barra", async () => {
    const h = harness(() => json(ACEPTADA, 201));
    await crearOrden(h.ports, body);
    expect(h.calls[0]!.url).toBe("https://ordenes.test/v1/ordenes");
    expect(h.calls[0]!.init.method).toBe("POST");
    expect(h.calls[0]!.init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(h.calls[0]!.init.body as string)).toEqual(body);
  });

  it("base sin barra final", async () => {
    const h = harness(() => json(ACEPTADA, 201), "https://ordenes.test");
    await crearOrden(h.ports, body);
    expect(h.calls[0]!.url).toBe("https://ordenes.test/v1/ordenes");
  });
});

describe("fetchEstado", () => {
  it("disponible: devuelve el token y cuándo se recibió", async () => {
    const h = harness(() => json({ v: 1, resultado: "disponible", form_token: "abc.def" }));
    expect(await fetchEstado(h.ports)).toEqual({
      kind: "disponible",
      form_token: "abc.def",
      emitidoEn: 1_000,
    });
    expect(h.calls[0]!.url).toBe("https://ordenes.test/v1/estado");
    expect(h.calls[0]!.init.method).toBe("GET");
  });

  it("tope_alcanzado", async () => {
    const h = harness(() => json({ v: 1, resultado: "tope_alcanzado" }));
    expect(await fetchEstado(h.ports)).toEqual({ kind: "tope_alcanzado" });
  });

  it("no_disponible (corte manual o flood) NO es tope_alcanzado", async () => {
    const h = harness(() => json({ v: 1, resultado: "no_disponible" }));
    const out = await fetchEstado(h.ports);
    expect(out).toEqual({ kind: "no_disponible" });
    expect(out.kind).not.toBe("tope_alcanzado");
  });

  it("red, body inválido, resultado desconocido, token vacío y URL sin configurar → falla", async () => {
    expect(await fetchEstado(harness(() => Promise.reject(new Error("x"))).ports)).toEqual({ kind: "falla" });
    expect(await fetchEstado(harness(() => new Response("nope", { status: 200 })).ports)).toEqual({
      kind: "falla",
    });
    expect(await fetchEstado(harness(() => json({ v: 1, resultado: "?" })).ports)).toEqual({ kind: "falla" });
    expect(
      await fetchEstado(harness(() => json({ v: 1, resultado: "disponible", form_token: "" })).ports),
    ).toEqual({ kind: "falla" });
    expect(await fetchEstado(harness(() => json({}), null).ports)).toEqual({ kind: "falla" });
  });
});

function line(id: string, extra: Partial<CartLine> = {}): CartLine {
  return {
    producto_id: id,
    cantidad: 2,
    precio_visto: 1000,
    nombre: `Nombre del producto ${id}`,
    presentacion: "100 ml",
    imagen: `/img/${id}.svg`,
    ...extra,
  };
}

const CLAVES_CONTRATO = ["contacto", "form_token", "idempotency_key", "lineas", "total_visto", "v"];

describe("buildCrearOrdenRequest (AC-17)", () => {
  const input = {
    idempotency_key: "11111111-1111-4111-8111-111111111111",
    form_token: "tok",
    lines: [line("a"), line("b", { cantidad: 1, precio_visto: 500 }), line("c", { no_disponible: true })],
    nombre: "  Ana   Pérez ",
    telefono: " 11 5555-5555 ",
  };

  it("emite exactamente las claves de CrearOrdenRequest", () => {
    const req = buildCrearOrdenRequest(input);
    expect(Object.keys(req).sort()).toEqual(CLAVES_CONTRATO);
    expect(Object.keys(req.contacto).sort()).toEqual(["nombre", "telefono"]);
    for (const l of req.lineas) {
      expect(Object.keys(l).sort()).toEqual(["cantidad", "precio_visto", "producto_id"]);
    }
  });

  it("nunca lleva nombre/presentación de producto ni claves de entrega", () => {
    const text = JSON.stringify(buildCrearOrdenRequest(input));
    for (const prohibido of [
      "Nombre del producto",
      "presentacion",
      "imagen",
      '"to"',
      '"cc"',
      '"bcc"',
      "reply_to",
      "webhook",
      "canal",
      "destinatario",
      "email",
      "direccion",
      "localidad",
    ]) {
      expect(text).not.toContain(prohibido);
    }
  });

  it("manda solo las disponibles, con total = Σ precio × cantidad", () => {
    const req = buildCrearOrdenRequest(input);
    expect(req.lineas.map((l) => l.producto_id)).toEqual(["a", "b"]);
    expect(req.total_visto).toBe(2 * 1000 + 500);
  });

  it("el contacto va normalizado: nombre colapsado y teléfono recortado", () => {
    expect(buildCrearOrdenRequest(input).contacto).toEqual({
      nombre: "Ana Pérez",
      telefono: "11 5555-5555",
    });
  });

  it("el honeypot vacío no viaja; con contenido se manda tal cual", () => {
    expect("sitio_web" in buildCrearOrdenRequest(input)).toBe(false);
    expect("sitio_web" in buildCrearOrdenRequest({ ...input, honeypot: "" })).toBe(false);
    expect(buildCrearOrdenRequest({ ...input, honeypot: "http://spam" }).sitio_web).toBe("http://spam");
  });

  it("un payload de 100 líneas se arma bien", () => {
    const lines = Array.from({ length: MAX_LINEAS }, (_, i) => line(`p${i}`, { cantidad: 1, precio_visto: 10 }));
    const req = buildCrearOrdenRequest({ ...input, lines });
    expect(req.lineas).toHaveLength(MAX_LINEAS);
    expect(req.total_visto).toBe(MAX_LINEAS * 10);
    expect(JSON.stringify(req).length).toBeLessThan(16 * 1024);
  });
});

describe("defaultPorts: sin `this` no lanzan (regresión Illegal invocation)", () => {
  it("schedule y cancel llamados como funciones sueltas", () => {
    const { schedule, cancel, now } = defaultPorts();
    let fired = false;
    const handle = schedule(() => {
      fired = true;
    }, 10_000);
    expect(() => cancel(handle)).not.toThrow();
    expect(fired).toBe(false);
    expect(typeof now()).toBe("number");
  });

  it("también como método de otro objeto", () => {
    const holder = { ports: defaultPorts() };
    const handle = holder.ports.schedule(() => {}, 10_000);
    expect(() => holder.ports.cancel(handle)).not.toThrow();
  });
});
