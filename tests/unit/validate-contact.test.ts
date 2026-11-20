import { describe, expect, it } from "vitest";

import {
  MENSAJE_NOMBRE_INVALIDO,
  MENSAJE_NOMBRE_VACIO,
  MENSAJE_TELEFONO_INVALIDO,
  MENSAJE_TELEFONO_VACIO,
  mapServerErrors,
  mensajeError,
  normalizeNombre,
  normalizeTelefono,
  validateContact,
  validateNombre,
  validateTelefono,
} from "@/lib/orders/validate-contact";

import { NOMBRE_VECTORES } from "./fixtures/nombre-vectores";

// spec 0017, F12 — AC-9, paridad cliente/servidor (plan.md "Paridad cliente/servidor del nombre").

describe("nombre: vectores compartidos con el servidor (B4)", () => {
  it.each(NOMBRE_VECTORES.map((v) => [v.id, v] as const))("%s", (_id, v) => {
    const r = validateNombre(v.entrada);
    if (v.esperado.ok) expect(r).toEqual({ ok: true, nombre: v.esperado.normalizado });
    else expect(r).toEqual({ ok: false, codigo: v.esperado.codigo });
  });

  it("normalizeNombre coincide con el normalizado de cada vector válido", () => {
    for (const v of NOMBRE_VECTORES) {
      if (v.esperado.ok) expect(normalizeNombre(v.entrada as string), v.id).toBe(v.esperado.normalizado);
    }
  });

  it("se mide en puntos de código, no en unidades UTF-16", () => {
    const astral = "\u{20BB7}";
    expect(validateNombre(astral.repeat(80)).ok).toBe(true);
    expect(validateNombre(astral.repeat(81))).toEqual({ ok: false, codigo: "largo" });
  });
});

describe("recortar antes de rechazar CR/LF/tab en los bordes", () => {
  it("un salto de línea o tab en los bordes no invalida el nombre", () => {
    expect(validateNombre("\nAna Pérez\n")).toEqual({ ok: true, nombre: "Ana Pérez" });
    expect(validateNombre("\tAna Pérez\r\n")).toEqual({ ok: true, nombre: "Ana Pérez" });
    expect(validateNombre("\n\t ")).toEqual({ ok: false, codigo: "requerido" });
  });

  it("adentro sí se rechaza", () => {
    expect(validateNombre("Ana\nPérez")).toEqual({ ok: false, codigo: "formato" });
    expect(validateNombre("Ana\tPérez")).toEqual({ ok: false, codigo: "formato" });
  });

  it("lo mismo para el teléfono", () => {
    expect(validateTelefono("\n11 5555 5555\t")).toEqual({ ok: true, telefono: "11 5555 5555" });
    expect(validateTelefono("11\n5555 5555")).toEqual({ ok: false, codigo: "formato" });
  });
});

describe("normalizeNombre / normalizeTelefono", () => {
  it("NFC, recorte y colapso de espacios internos", () => {
    expect(normalizeNombre("  Ana    Pérez ")).toBe("Ana Pérez");
    expect(normalizeNombre("María")).toBe("María");
  });

  it("el teléfono solo se recorta (se manda con sus separadores)", () => {
    expect(normalizeTelefono("  +54 (11) 5555-5555 ")).toBe("+54 (11) 5555-5555");
  });
});

describe("teléfono (8 a 15 dígitos)", () => {
  it.each([
    ["11 5555 5555", true],
    ["1155555555", true],
    ["+54 9 11 5555-5555", true],
    ["(011) 5555-5555", true],
    ["12345678", true],
    ["123456789012345", true],
    ["1234567", false],
    ["1234567890123456", false],
    ["11 5555 abcd", false],
    ["11.5555.5555", false],
    ["١١٢٢٣٣٤٤٥٥", false],
    ["", false],
    ["   ", false],
  ])("%j → ok: %s", (entrada, ok) => {
    expect(validateTelefono(entrada).ok).toBe(ok);
  });

  it("vacío o solo espacios → requerido; lo demás → formato", () => {
    expect(validateTelefono("")).toEqual({ ok: false, codigo: "requerido" });
    expect(validateTelefono("  ")).toEqual({ ok: false, codigo: "requerido" });
    expect(validateTelefono(undefined)).toEqual({ ok: false, codigo: "requerido" });
    expect(validateTelefono("123")).toEqual({ ok: false, codigo: "formato" });
    expect(validateTelefono(1155555555)).toEqual({ ok: false, codigo: "formato" });
  });

  it("devuelve el valor recortado, tal cual lo escribió", () => {
    expect(validateTelefono(" 11 5555 5555 ")).toEqual({ ok: true, telefono: "11 5555 5555" });
  });
});

describe("validateContact: orden y copy textual", () => {
  it("todo vacío → dos errores, nombre primero", () => {
    expect(validateContact({ nombre: "", telefono: "" })).toEqual([
      { campo: "nombre", codigo: "requerido" },
      { campo: "telefono", codigo: "requerido" },
    ]);
  });

  it("solo uno con error → un ítem", () => {
    expect(validateContact({ nombre: "", telefono: "11 5555 5555" })).toEqual([
      { campo: "nombre", codigo: "requerido" },
    ]);
    expect(validateContact({ nombre: "Ana Pérez", telefono: "123" })).toEqual([
      { campo: "telefono", codigo: "formato" },
    ]);
  });

  it('"Madonna" y "Ana Pérez" pasan', () => {
    expect(validateContact({ nombre: "Madonna", telefono: "11 5555 5555" })).toEqual([]);
    expect(validateContact({ nombre: "Ana Pérez", telefono: "11 5555 5555" })).toEqual([]);
  });

  it("copy textual de ux.md", () => {
    expect(MENSAJE_NOMBRE_VACIO).toBe("Dejanos tu nombre y apellido para saber a quién llamar.");
    expect(MENSAJE_NOMBRE_INVALIDO).toBe(
      "Revisá el nombre: escribilo con letras y hasta 80 caracteres (ej.: Ana Pérez).",
    );
    expect(MENSAJE_TELEFONO_VACIO).toBe("Dejanos un teléfono para contactarte.");
    expect(MENSAJE_TELEFONO_INVALIDO).toBe(
      "Revisá el teléfono: escribilo con código de área, solo números (ej.: 11 5555 5555).",
    );
  });

  it("mensajeError: requerido → vacío; formato y largo → Revisá", () => {
    expect(mensajeError("nombre", "requerido")).toBe(MENSAJE_NOMBRE_VACIO);
    expect(mensajeError("nombre", "formato")).toBe(MENSAJE_NOMBRE_INVALIDO);
    expect(mensajeError("nombre", "largo")).toBe(MENSAJE_NOMBRE_INVALIDO);
    expect(mensajeError("telefono", "requerido")).toBe(MENSAJE_TELEFONO_VACIO);
    expect(mensajeError("telefono", "formato")).toBe(MENSAJE_TELEFONO_INVALIDO);
  });
});

describe("mapServerErrors", () => {
  it("contacto.nombre requerido / formato / largo", () => {
    for (const [codigo, esperado] of [
      ["requerido", "requerido"],
      ["formato", "formato"],
      ["largo", "formato"],
    ] as const) {
      const m = mapServerErrors([{ campo: "contacto.nombre", codigo }]);
      expect(m).toEqual([{ campo: "nombre", codigo: esperado }]);
    }
    expect(mensajeError("nombre", mapServerErrors([{ campo: "contacto.nombre", codigo: "largo" }])[0]!.codigo)).toBe(
      MENSAJE_NOMBRE_INVALIDO,
    );
  });

  it("ambos campos, siempre en el orden del formulario y sin repetir", () => {
    expect(
      mapServerErrors([
        { campo: "contacto.telefono", codigo: "formato" },
        { campo: "contacto.nombre", codigo: "requerido" },
        { campo: "contacto.nombre", codigo: "formato" },
      ]),
    ).toEqual([
      { campo: "nombre", codigo: "requerido" },
      { campo: "telefono", codigo: "formato" },
    ]);
  });

  it("errores: [], lineas, total_visto, null y token → nada mapeable (error general)", () => {
    expect(mapServerErrors([])).toEqual([]);
    expect(
      mapServerErrors([
        { campo: "lineas", codigo: "formato" },
        { campo: "total_visto", codigo: "formato" },
        { campo: null, codigo: "no_permitido" },
        { campo: "form_token", codigo: "token_vencido" },
      ]),
    ).toEqual([]);
  });
});
