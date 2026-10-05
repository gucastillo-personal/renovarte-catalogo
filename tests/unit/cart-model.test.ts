import { describe, expect, it } from "vitest";

import {
  MAX_POR_LINEA,
  addCombo,
  addProduct,
  clear,
  parseStored,
  removeLine,
  restoreLine,
  serialize,
  setCantidad,
  subtotal,
  total,
  unidadesDisponibles,
  type CartLine,
  type CartProductInput,
} from "@/lib/cart/model";

const crema: CartProductInput = { id: "c1", nombre: "Crema", presentacion: "50 ml", imagen: "/img/c1.svg", precio_venta: 12000 };
const suero: CartProductInput = { id: "s1", nombre: "Suero", presentacion: "30 ml", imagen: "/img/s1.svg", precio_venta: 8000 };
const gel: CartProductInput = { id: "g1", nombre: "Gel", presentacion: "", imagen: "/img/g1.svg", precio_venta: 5000 };

describe("agregar (AC-3, AC-4, AC-6)", () => {
  it("agrega una línea nueva con cantidad 1 y el precio visto", () => {
    const { lines, topeado } = addProduct([], crema);
    expect(lines).toEqual([
      { producto_id: "c1", cantidad: 1, precio_visto: 12000, nombre: "Crema", presentacion: "50 ml", imagen: "/img/c1.svg" },
    ]);
    expect(topeado).toBe(false);
  });

  it("agregar de nuevo suma a la misma línea, sin duplicar (AC-4)", () => {
    const una = addProduct([], crema).lines;
    const dos = addProduct(una, crema).lines;
    expect(dos).toHaveLength(1);
    expect(dos[0]?.cantidad).toBe(2);
  });

  it("agregar refresca el precio al que ve el visitante", () => {
    const una = addProduct([], crema).lines;
    const dos = addProduct(una, { ...crema, precio_venta: 13000 }).lines;
    expect(dos[0]?.precio_visto).toBe(13000);
  });

  it("addCombo suma 1 de cada producto, sobre lo que ya hubiera (AC-6)", () => {
    const base = addProduct([], crema).lines;
    const { lines } = addCombo(base, [crema, suero, gel]);
    expect(lines.map((l) => [l.producto_id, l.cantidad])).toEqual([
      ["c1", 2],
      ["s1", 1],
      ["g1", 1],
    ]);
  });

  it("no muta el array de entrada", () => {
    const base = addProduct([], crema).lines;
    const copia = JSON.parse(JSON.stringify(base));
    addProduct(base, crema);
    addCombo(base, [suero]);
    expect(base).toEqual(copia);
  });
});

describe("límites de cantidad", () => {
  it("tope en MAX_POR_LINEA y devuelve topeado", () => {
    expect(MAX_POR_LINEA).toBe(20);
    let lines: CartLine[] = [];
    for (let i = 0; i < MAX_POR_LINEA; i++) lines = addProduct(lines, crema).lines;
    expect(lines[0]?.cantidad).toBe(20);
    const r = addProduct(lines, crema);
    expect(r.lines[0]?.cantidad).toBe(20);
    expect(r.topeado).toBe(true);
  });

  it("addCombo topea la línea que ya está en 20 y suma el resto", () => {
    let lines: CartLine[] = [];
    for (let i = 0; i < MAX_POR_LINEA; i++) lines = addProduct(lines, crema).lines;
    const r = addCombo(lines, [crema, suero]);
    expect(r.topeado).toBe(true);
    expect(r.lines.find((l) => l.producto_id === "c1")?.cantidad).toBe(20);
    expect(r.lines.find((l) => l.producto_id === "s1")?.cantidad).toBe(1);
  });

  it("setCantidad acota a 1..20 y no toca otras líneas", () => {
    const base = addCombo([], [crema, suero]).lines;
    expect(setCantidad(base, "c1", 7)[0]?.cantidad).toBe(7);
    expect(setCantidad(base, "c1", 0)[0]?.cantidad).toBe(1);
    expect(setCantidad(base, "c1", -3)[0]?.cantidad).toBe(1);
    expect(setCantidad(base, "c1", 99)[0]?.cantidad).toBe(20);
    expect(setCantidad(base, "c1", Number.NaN)[0]?.cantidad).toBe(1);
    expect(setCantidad(base, "c1", 5)[1]?.cantidad).toBe(1);
    expect(setCantidad(base, "nope", 5)).toEqual(base);
  });

  it("no impone tope de líneas (decisión Q-F1)", () => {
    let lines: CartLine[] = [];
    for (let i = 0; i < 150; i++) {
      lines = addProduct(lines, { ...crema, id: `p${i}` }).lines;
    }
    expect(lines).toHaveLength(150);
  });
});

describe("quitar, restaurar y vaciar", () => {
  it("quita y restaura en la misma posición", () => {
    const base = addCombo([], [crema, suero, gel]).lines;
    const { lines, removed } = removeLine(base, "s1");
    expect(lines.map((l) => l.producto_id)).toEqual(["c1", "g1"]);
    expect(removed?.index).toBe(1);
    const back = restoreLine(lines, removed!.line, removed!.index);
    expect(back).toEqual(base);
  });

  it("quitar un id inexistente no cambia nada", () => {
    const base = addProduct([], crema).lines;
    const r = removeLine(base, "nope");
    expect(r.removed).toBeNull();
    expect(r.lines).toEqual(base);
  });

  it("restaurar no duplica una línea que ya volvió a estar", () => {
    const base = addProduct([], crema).lines;
    const { removed } = removeLine(base, "c1");
    expect(restoreLine(base, removed!.line, 0)).toEqual(base);
  });

  it("restaurar con un índice fuera de rango lo deja al final", () => {
    const base = addCombo([], [crema, suero]).lines;
    const { lines, removed } = removeLine(base, "c1");
    expect(restoreLine(lines, removed!.line, 99).map((l) => l.producto_id)).toEqual(["s1", "c1"]);
  });

  it("vaciar deja el carrito vacío", () => {
    expect(clear()).toEqual([]);
  });
});

describe("subtotal, total y unidades", () => {
  it("subtotal = precio × cantidad; total = suma de subtotales (AC-3)", () => {
    let lines = addCombo([], [crema, suero]).lines;
    lines = setCantidad(lines, "c1", 3);
    expect(subtotal(lines[0]!)).toBe(36000);
    expect(total(lines)).toBe(36000 + 8000);
    expect(unidadesDisponibles(lines)).toBe(4);
  });

  it("las no disponibles no cuentan en unidades ni en el total", () => {
    const lines = addCombo([], [crema, suero]).lines.map((l) =>
      l.producto_id === "s1" ? { ...l, no_disponible: true as const } : l,
    );
    expect(unidadesDisponibles(lines)).toBe(1);
    expect(total(lines)).toBe(12000);
  });

  it("carrito vacío: 0 unidades y total 0", () => {
    expect(unidadesDisponibles([])).toBe(0);
    expect(total([])).toBe(0);
  });
});

describe("persistencia", () => {
  it("serialize + parseStored hacen ida y vuelta", () => {
    const lines = setCantidad(addCombo([], [crema, suero]).lines, "c1", 4);
    expect(parseStored(serialize(lines))).toEqual(lines);
  });

  it("conserva la marca no_disponible", () => {
    const lines: CartLine[] = [{ ...addProduct([], crema).lines[0]!, no_disponible: true }];
    expect(parseStored(serialize(lines))[0]?.no_disponible).toBe(true);
  });

  it("serialize usa allowlist: ninguna clave ajena a CartLine (AC-18)", () => {
    const sucia = { ...addProduct([], crema).lines[0]!, telefono: "1155555555", nombre_cliente: "Ana" } as CartLine;
    const raw = serialize([sucia]);
    expect(raw).not.toContain("1155555555");
    expect(raw).not.toContain("Ana");
    const stored = JSON.parse(raw) as { lines: Array<Record<string, unknown>> };
    expect(Object.keys(stored.lines[0]!).sort()).toEqual(
      ["cantidad", "imagen", "nombre", "precio_visto", "presentacion", "producto_id"].sort(),
    );
  });

  it("JSON corrupto, de otra versión o sin forma → vacío", () => {
    expect(parseStored(null)).toEqual([]);
    expect(parseStored("")).toEqual([]);
    expect(parseStored("{no es json")).toEqual([]);
    expect(parseStored("null")).toEqual([]);
    expect(parseStored('"hola"')).toEqual([]);
    expect(parseStored("[]")).toEqual([]);
    expect(parseStored(JSON.stringify({ v: 2, lines: [] }))).toEqual([]);
    expect(parseStored(JSON.stringify({ v: 1, lines: "x" }))).toEqual([]);
  });

  it("descarta las líneas inválidas y las repetidas, y conserva las buenas", () => {
    const buena = addProduct([], crema).lines[0]!;
    const raw = JSON.stringify({
      v: 1,
      lines: [
        buena,
        buena,
        { ...buena, producto_id: "x1", cantidad: 0 },
        { ...buena, producto_id: "x2", cantidad: 21 },
        { ...buena, producto_id: "x3", cantidad: 1.5 },
        { ...buena, producto_id: "x4", precio_visto: -1 },
        { ...buena, producto_id: "x5", nombre: 7 },
        { ...buena, producto_id: "" },
        null,
        "x",
      ],
    });
    expect(parseStored(raw)).toEqual([buena]);
  });
});
