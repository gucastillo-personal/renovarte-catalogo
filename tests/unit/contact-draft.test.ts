import { describe, expect, it } from "vitest";

import { CONTACT_DRAFT_KEY, clearDraft, readDraft, writeDraft } from "@/lib/orders/contact-draft";

// spec 0017, F12 — borrador del formulario (AC-28, ADR-0020).

class FakeStorage {
  data = new Map<string, string>();
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => void this.data.set(k, v);
  removeItem = (k: string) => void this.data.delete(k);
}

describe("contact-draft", () => {
  it("la clave es la versionada de sessionStorage", () => {
    expect(CONTACT_DRAFT_KEY).toBe("renovarte:contacto-borrador:v1");
  });

  it("guarda y lee { nombre, telefono }", () => {
    const s = new FakeStorage();
    writeDraft(s, { nombre: "Ana Pérez", telefono: "11 5555 5555" });
    expect(readDraft(s)).toEqual({ nombre: "Ana Pérez", telefono: "11 5555 5555" });
  });

  it("solo 2 claves, aunque llegue un objeto con más (allowlist)", () => {
    const s = new FakeStorage();
    const sucio = { nombre: "Ana", telefono: "1155555555", email: "a@b.c", direccion: "X", localidad: "Y" };
    writeDraft(s, sucio);
    const guardado = JSON.parse(s.getItem(CONTACT_DRAFT_KEY)!);
    expect(Object.keys(guardado).sort()).toEqual(["nombre", "telefono"]);
    expect(s.data.size).toBe(1);
    expect(s.getItem(CONTACT_DRAFT_KEY)).not.toContain("a@b.c");
  });

  it("lo guardado con claves de más se lee proyectado", () => {
    const s = new FakeStorage();
    s.setItem(CONTACT_DRAFT_KEY, JSON.stringify({ nombre: "Ana", telefono: "1", email: "x@y.z" }));
    expect(readDraft(s)).toEqual({ nombre: "Ana", telefono: "1" });
  });

  it("JSON corrupto o con otra forma → nada", () => {
    for (const raw of ["{no", "null", "[]", '"x"', '{"nombre":1,"telefono":"x"}', '{"nombre":"x"}']) {
      const s = new FakeStorage();
      s.setItem(CONTACT_DRAFT_KEY, raw);
      expect(readDraft(s), raw).toBeNull();
    }
  });

  it("sin nada guardado → nada", () => {
    expect(readDraft(new FakeStorage())).toBeNull();
  });

  it("borrar", () => {
    const s = new FakeStorage();
    writeDraft(s, { nombre: "Ana", telefono: "1" });
    clearDraft(s);
    expect(readDraft(s)).toBeNull();
    expect(s.data.size).toBe(0);
  });

  it("si ambos campos quedan vacíos no deja un borrador", () => {
    const s = new FakeStorage();
    writeDraft(s, { nombre: "Ana", telefono: "1" });
    writeDraft(s, { nombre: "", telefono: "" });
    expect(s.data.size).toBe(0);
  });

  it("sin storage o con storage que lanza: no rompe", () => {
    expect(readDraft(null)).toBeNull();
    expect(() => writeDraft(null, { nombre: "a", telefono: "b" })).not.toThrow();
    expect(() => clearDraft(null)).not.toThrow();
    const roto = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("lleno");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    };
    expect(readDraft(roto)).toBeNull();
    expect(() => writeDraft(roto, { nombre: "a", telefono: "b" })).not.toThrow();
    expect(() => clearDraft(roto)).not.toThrow();
  });
});
