import { describe, expect, it, vi } from "vitest";

import { addCombo, addProduct, serialize, type CartLine } from "@/lib/cart/model";
import { CART_STORAGE_KEY, createCartStore } from "@/lib/cart/store";

const crema = { id: "c1", nombre: "Crema", presentacion: "50 ml", imagen: "/img/c1.svg", precio_venta: 12000 };
const suero = { id: "s1", nombre: "Suero", presentacion: "30 ml", imagen: "/img/s1.svg", precio_venta: 8000 };

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

function fakeTarget() {
  const ls = new Set<(e: { key: string | null }) => void>();
  return {
    ls,
    addEventListener: (_t: "storage", l: (e: { key: string | null }) => void) => void ls.add(l),
    removeEventListener: (_t: "storage", l: (e: { key: string | null }) => void) => void ls.delete(l),
    emit: (key: string | null) => ls.forEach((l) => l({ key })),
  };
}

describe("cart store", () => {
  it("arranca vacío y el snapshot de servidor siempre es vacío", () => {
    const store = createCartStore({ storage: fakeStorage() });
    expect(store.getSnapshot()).toEqual([]);
    expect(store.getServerSnapshot()).toEqual([]);
    store.update((l) => addProduct(l, crema).lines);
    expect(store.getServerSnapshot()).toEqual([]);
  });

  it("persiste en la clave versionada y notifica (AC-5)", () => {
    const storage = fakeStorage();
    const store = createCartStore({ storage });
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((l) => addProduct(l, crema).lines);
    expect(CART_STORAGE_KEY).toBe("renovarte:carrito:v1");
    expect(storage.data.has(CART_STORAGE_KEY)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()[0]?.producto_id).toBe("c1");
  });

  it("lo guardado sobrevive a un store nuevo (recarga)", () => {
    const storage = fakeStorage();
    createCartStore({ storage }).update((l) => addCombo(l, [crema, suero]).lines);
    const recargado = createCartStore({ storage });
    expect(recargado.getSnapshot().map((l) => l.producto_id)).toEqual(["c1", "s1"]);
  });

  it("el snapshot es estable hasta que algo cambia", () => {
    const store = createCartStore({ storage: fakeStorage() });
    const a = store.getSnapshot();
    expect(store.getSnapshot()).toBe(a);
    store.update((l) => addProduct(l, crema).lines);
    expect(store.getSnapshot()).not.toBe(a);
  });

  it("sincroniza la otra pestaña con el evento storage", () => {
    const storage = fakeStorage();
    const target = fakeTarget();
    const store = createCartStore({ storage, target });
    const listener = vi.fn();
    store.subscribe(listener);
    // Otra pestaña escribe:
    storage.data.set(CART_STORAGE_KEY, serialize(addProduct([], suero).lines));
    target.emit(CART_STORAGE_KEY);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().map((l) => l.producto_id)).toEqual(["s1"]);
  });

  it("ignora eventos storage de otras claves y reacciona a clear() (key null)", () => {
    const storage = fakeStorage();
    const target = fakeTarget();
    const store = createCartStore({ storage, target });
    store.update((l) => addProduct(l, crema).lines);
    const listener = vi.fn();
    store.subscribe(listener);
    target.emit("otra-clave");
    expect(listener).not.toHaveBeenCalled();
    storage.data.clear();
    target.emit(null);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual([]);
  });

  it("se desuscribe del evento storage cuando no quedan oyentes", () => {
    const target = fakeTarget();
    const store = createCartStore({ storage: fakeStorage(), target });
    const un1 = store.subscribe(() => {});
    const un2 = store.subscribe(() => {});
    expect(target.ls.size).toBe(1);
    un1();
    expect(target.ls.size).toBe(1);
    un2();
    expect(target.ls.size).toBe(0);
  });

  it("vaciar borra la clave", () => {
    const storage = fakeStorage();
    const store = createCartStore({ storage });
    store.update((l) => addProduct(l, crema).lines);
    store.update(() => []);
    expect(storage.data.has(CART_STORAGE_KEY)).toBe(false);
  });

  it("nunca serializa claves que no sean de CartLine (AC-18)", () => {
    const storage = fakeStorage();
    const store = createCartStore({ storage });
    store.update(
      (l) =>
        [{ ...addProduct(l, crema).lines[0]!, telefono: "1155555555" } as CartLine],
    );
    const raw = storage.data.get(CART_STORAGE_KEY)!;
    expect(raw).not.toContain("1155555555");
    expect(raw).not.toContain("telefono");
  });

  it("sin storage (o que lanza) funciona en memoria", () => {
    const sinStorage = createCartStore({ storage: null });
    sinStorage.update((l) => addProduct(l, crema).lines);
    expect(sinStorage.getSnapshot()).toHaveLength(1);

    const roto = createCartStore({
      storage: {
        getItem: () => {
          throw new Error("bloqueado");
        },
        setItem: () => {
          throw new Error("lleno");
        },
        removeItem: () => {
          throw new Error("bloqueado");
        },
      },
    });
    expect(roto.getSnapshot()).toEqual([]);
    roto.update((l) => addProduct(l, crema).lines);
    expect(roto.getSnapshot()).toHaveLength(1);
  });

  it("con JSON corrupto guardado arranca vacío", () => {
    const store = createCartStore({ storage: fakeStorage({ [CART_STORAGE_KEY]: "{roto" }) });
    expect(store.getSnapshot()).toEqual([]);
  });
});
