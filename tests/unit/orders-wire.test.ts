import { describe, expect, it } from "vitest";

import {
  MAX_LINEAS,
  isCrearOrdenResponse,
  isEstadoResponse,
  type CrearOrdenRequest,
} from "@/lib/orders/wire";

describe("isEstadoResponse", () => {
  it("acepta cada variante", () => {
    expect(isEstadoResponse({ v: 1, resultado: "disponible", form_token: "t.s" })).toBe(true);
    expect(isEstadoResponse({ v: 1, resultado: "tope_alcanzado" })).toBe(true);
    expect(isEstadoResponse({ v: 1, resultado: "no_disponible" })).toBe(true);
  });

  it("rechaza lo desconocido o malformado", () => {
    expect(isEstadoResponse({ v: 1, resultado: "otra" })).toBe(false);
    expect(isEstadoResponse({ v: 1, resultado: "disponible" })).toBe(false);
    expect(isEstadoResponse({ v: 1, resultado: "disponible", form_token: "" })).toBe(false);
    expect(isEstadoResponse({ v: 2, resultado: "no_disponible" })).toBe(false);
    expect(isEstadoResponse(null)).toBe(false);
    expect(isEstadoResponse("x")).toBe(false);
    expect(isEstadoResponse([])).toBe(false);
  });
});

describe("isCrearOrdenResponse", () => {
  it("acepta cada variante", () => {
    const ok = [
      { v: 1, resultado: "aceptada", numero_orden: "RA-48271", recibida_en: "2026-10-05T12:00:00Z" },
      {
        v: 1,
        resultado: "rechazada_por_catalogo",
        lineas: [
          { producto_id: "a", estado: "precio_cambiado", precio_vigente: 100 },
          { producto_id: "b", estado: "no_disponible" },
        ],
        total_vigente: 100,
      },
      {
        v: 1,
        resultado: "invalida",
        errores: [
          { campo: "contacto.nombre", codigo: "requerido" },
          { campo: "contacto.nombre", codigo: "formato" },
          { campo: "contacto.nombre", codigo: "largo" },
          { campo: "contacto.telefono", codigo: "formato" },
          { campo: null, codigo: "token_vencido" },
        ],
      },
      { v: 1, resultado: "invalida", errores: [] },
      { v: 1, resultado: "tope_alcanzado" },
      { v: 1, resultado: "falla", codigo: "mantenimiento" },
    ];
    for (const body of ok) expect(isCrearOrdenResponse(body)).toBe(true);
  });

  it("la aceptada no trae nombre ni otro dato personal", () => {
    const body = { v: 1, resultado: "aceptada", numero_orden: "RA-48271", recibida_en: "2026-10-05T12:00:00Z" };
    expect(isCrearOrdenResponse(body)).toBe(true);
    expect(Object.keys(body).sort()).toEqual(["numero_orden", "recibida_en", "resultado", "v"]);
  });

  it("rechaza un resultado desconocido o un body malformado", () => {
    const bad: unknown[] = [
      { v: 1, resultado: "pendiente" },
      { v: 1, resultado: "aceptada", numero_orden: "RA-1" },
      { v: 1, resultado: "aceptada", numero_orden: "", recibida_en: "x" },
      { v: 1, resultado: "rechazada_por_catalogo", lineas: [{ producto_id: "a", estado: "rara" }], total_vigente: 1 },
      { v: 1, resultado: "rechazada_por_catalogo", lineas: [], total_vigente: 1.5 },
      { v: 1, resultado: "invalida", errores: [{ campo: "contacto.email", codigo: "requerido" }] },
      { v: 1, resultado: "invalida", errores: [{ campo: null, codigo: "contacto_requerido" }] },
      { v: 1, resultado: "falla", codigo: "explotó" },
      { v: 1, resultado: "falla" },
      { resultado: "tope_alcanzado" },
      null,
      42,
    ];
    for (const body of bad) expect(isCrearOrdenResponse(body)).toBe(false);
  });
});

describe("contrato de la orden", () => {
  it("MAX_LINEAS es 100 y un payload de ese tamaño se arma bien", () => {
    expect(MAX_LINEAS).toBe(100);
    const lineas = Array.from({ length: MAX_LINEAS }, (_, i) => ({
      producto_id: `p${i}`,
      cantidad: 1,
      precio_visto: 1000,
    }));
    const req: CrearOrdenRequest = {
      v: 1,
      idempotency_key: "00000000-0000-4000-8000-000000000000",
      form_token: "t.s",
      lineas,
      total_visto: 100_000,
      contacto: { nombre: "Ana Pérez", telefono: "11 5555 5555" },
    };
    expect(req.lineas).toHaveLength(100);
    expect(Object.keys(req.contacto)).toEqual(["nombre", "telefono"]);
  });
});
