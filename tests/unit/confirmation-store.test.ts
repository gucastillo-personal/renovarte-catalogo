import { describe, expect, it } from "vitest";

import { ENVIO_EN_CURSO_KEY } from "@/lib/orders/checkout";
import {
  CONFIRMATION_KEY,
  clearConfirmation,
  clearOrderSession,
  readConfirmation,
  writeConfirmation,
  type Confirmation,
} from "@/lib/orders/confirmation-store";
import { CONTACT_DRAFT_KEY } from "@/lib/orders/contact-draft";

// spec 0017, F15 — confirmation-store (AC-28, Q-F5).

class FakeStorage {
  data = new Map<string, string>();
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => void this.data.set(k, v);
  removeItem = (k: string) => void this.data.delete(k);
}

const conf: Confirmation = {
  numero_orden: "RA-48271",
  lineas: [{ nombre: "Crema", presentacion: "160 g", cantidad: 2, precio: 1000 }],
  total: 2000,
  nombre: "Ana Pérez",
  telefono: "11 5555 5555",
};

describe("confirmation-store", () => {
  it("la clave es la versionada de sessionStorage", () => {
    expect(CONFIRMATION_KEY).toBe("renovarte:orden-confirmada:v1");
  });

  it("guarda y lee la confirmación", () => {
    const s = new FakeStorage();
    writeConfirmation(s, conf);
    expect(readConfirmation(s)).toEqual(conf);
  });

  it("solo la allowlist: nunca email, dirección ni localidad, aunque el objeto los traiga", () => {
    const s = new FakeStorage();
    const sucio = {
      ...conf,
      email: "a@b.c",
      direccion: "Calle 1",
      localidad: "CABA",
      lineas: [{ ...conf.lineas[0], imagen: "/x.png", producto_id: "p1" }],
    };
    writeConfirmation(s, sucio as unknown as Confirmation);
    const raw = s.getItem(CONFIRMATION_KEY)!;
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(
      ["lineas", "nombre", "numero_orden", "telefono", "total"],
    );
    expect(Object.keys(JSON.parse(raw).lineas[0]).sort()).toEqual(
      ["cantidad", "nombre", "precio", "presentacion"],
    );
    for (const dato of ["a@b.c", "Calle 1", "CABA", "producto_id"]) expect(raw).not.toContain(dato);
    expect(s.data.size).toBe(1);
  });

  it("JSON corrupto o con otra forma → nada", () => {
    for (const raw of ["{no", "null", "[]", '{"numero_orden":"RA-1"}', '{"numero_orden":"","lineas":[],"total":1,"nombre":"a","telefono":"b"}']) {
      const s = new FakeStorage();
      s.setItem(CONFIRMATION_KEY, raw);
      expect(readConfirmation(s), raw).toBeNull();
    }
  });

  it("sin storage no hace nada ni lanza", () => {
    expect(() => writeConfirmation(null, conf)).not.toThrow();
    expect(readConfirmation(null)).toBeNull();
    expect(() => clearConfirmation(null)).not.toThrow();
    expect(() => clearOrderSession(null)).not.toThrow();
  });

  it("clearOrderSession borra confirmación, borrador y key en curso, y nada más", () => {
    const s = new FakeStorage();
    s.setItem(CONFIRMATION_KEY, "x");
    s.setItem(CONTACT_DRAFT_KEY, "x");
    s.setItem(ENVIO_EN_CURSO_KEY, "x");
    s.setItem("otra", "y");
    clearOrderSession(s);
    expect([...s.data.keys()]).toEqual(["otra"]);
  });
});
