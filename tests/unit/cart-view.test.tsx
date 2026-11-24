import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CartViewContent, type CartViewActions } from "@/components/cart/CartView";
import type { CartLine } from "@/lib/cart/model";
import { formatARS } from "@/lib/format";

// spec 0017, F8/F9 — contenido de `/carrito` (ux.md "Página /carrito",
// "Estados y responsividad"). AC-8: con el carrito vacío no hay forma de
// generar una orden.

const noop = () => {};
const actions: CartViewActions = {
  onMinus: noop,
  onPlus: noop,
  onRemove: noop,
  onUndo: noop,
  onAskClear: noop,
  onCancelClear: noop,
  onConfirmClear: noop,
  onAskColibri: noop,
};

function line(id: string, extra: Partial<CartLine> = {}): CartLine {
  return {
    producto_id: id,
    cantidad: 2,
    precio_visto: 10000,
    nombre: `Producto ${id}`,
    presentacion: "100 ml",
    imagen: `/img/${id}.svg`,
    ...extra,
  };
}

function render(props: Partial<Parameters<typeof CartViewContent>[0]> = {}): string {
  return renderToStaticMarkup(
    <CartViewContent
      ready
      lines={[]}
      notas={[]}
      undo={null}
      confirmingClear={false}
      actions={actions}
      {...props}
    />,
  );
}

describe("CartView — antes de leer el estado", () => {
  it("se ve solo el h1 (sin un vacío que parpadee a lleno)", () => {
    const html = render({ ready: false, lines: [line("a")] });
    expect(html).toMatch(/<h1[^>]*>Tu carrito<\/h1>/);
    expect(html).not.toContain("vacío");
    expect(html).not.toContain("Producto a");
    expect(html).not.toContain("<ul");
  });

  it("el h1 es enfocable por código (tabindex -1)", () => {
    expect(render({ ready: false })).toMatch(/<h1[^>]*tabindex="-1"/);
  });
});

describe("CartView — carrito vacío (AC-8)", () => {
  const html = render();

  it('muestra "Tu carrito está vacío." y "Ver catálogo" a /#catalogo', () => {
    expect(html).toContain("Tu carrito está vacío.");
    expect(html).toMatch(/<a[^>]*href="\/#catalogo"[^>]*>Ver catálogo<\/a>/);
  });

  it("ofrece pedirle un combo a Colibrí", () => {
    expect(html).toContain("¿No sabés qué elegir? Pedile un combo a Colibrí");
  });

  it("no hay <form>, campos, total ni botón de enviar", () => {
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("Enviar orden");
    expect(html).not.toContain("Total (");
    expect(html).not.toContain("Vaciar carrito");
  });

  it("es una sola columna", () => {
    expect(html).not.toContain("grid-cols-[1fr_380px]");
  });

  it('sin "N productos" junto al h1', () => {
    expect(html).not.toMatch(/\d+ productos?</);
  });
});

describe("CartView — con productos", () => {
  const lines = [line("a"), line("b", { cantidad: 1 })];
  const html = render({ lines });

  it("lista accesible de líneas", () => {
    expect(html).toContain('<ul aria-label="Productos en tu carrito"');
    expect(html).toContain("Producto a");
    expect(html).toContain("Producto b");
  });

  it('"N productos" cuenta unidades junto al h1 y en el total', () => {
    expect(html).toContain("3 productos");
    expect(html).toContain("Total (3 productos)");
  });

  it("total = suma de subtotales", () => {
    expect(html).toContain(formatARS(30000));
  });

  it('incluye la aclaración "No se cobra nada en este paso" (AC-12)', () => {
    expect(html).toContain(
      "No se cobra nada en este paso. RenovArte te contacta para coordinar el pago y el envío.",
    );
  });

  it("layout de 2 columnas desde md, con la derecha sticky bajo el header", () => {
    expect(html).toContain("md:grid-cols-[1fr_380px]");
    expect(html).toContain("md:[@media(min-height:760px)]:sticky");
    expect(html).toContain("md:[@media(min-height:760px)]:top-[88px]");
  });

  it('"Vaciar carrito" y "← Seguir comprando" a /', () => {
    expect(html).toContain("Vaciar carrito");
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>← Seguir comprando<\/a>/);
  });

  it("el formulario entra por `form`, dentro de la caja de resumen, después del total", () => {
    expect(html).not.toContain("<form");
    const conForm = render({ lines, form: <form data-testid="f">FORM</form> });
    expect(conForm.indexOf("Total (3 productos)")).toBeLessThan(conForm.indexOf("FORM"));
    expect(conForm.indexOf("FORM")).toBeLessThan(conForm.indexOf("</section>"));
  });

  it("sin aviso de revalidación si no hubo cambios", () => {
    expect(html).not.toContain("Actualizamos tu carrito");
  });
});

describe("CartView — revalidación (AC-15)", () => {
  it("precio cambiado: aviso neutro con role=status, nota en la línea", () => {
    const html = render({
      lines: [line("a")],
      notas: [{ producto_id: "a", antes: 13900, ahora: 14400 }],
    });
    expect(html).toMatch(/<div role="status"[^>]*>/);
    expect(html).toContain("Actualizamos tu carrito con el catálogo vigente.");
    expect(html).toContain("1 precio cambió desde que lo agregaste.");
    expect(html).toContain("El precio cambió: antes");
  });

  it("producto que ya no existe: aviso en singular y plural", () => {
    const uno = render({ lines: [line("a"), line("x", { no_disponible: true })] });
    expect(uno).toContain(
      "1 producto ya no está en el catálogo y no se va a incluir en la orden.",
    );
    const dos = render({
      lines: [line("a"), line("x", { no_disponible: true }), line("y", { no_disponible: true })],
    });
    expect(dos).toContain(
      "2 productos ya no están en el catálogo y no se van a incluir en la orden.",
    );
  });

  it("la no disponible no suma al contador ni al total", () => {
    const html = render({ lines: [line("a"), line("x", { no_disponible: true, cantidad: 5 })] });
    expect(html).toContain("Total (2 productos)");
    expect(html).toContain(formatARS(20000));
  });

  it("una nota de una línea que ya no está no se muestra", () => {
    const html = render({
      lines: [line("a")],
      notas: [{ producto_id: "borrada", antes: 1, ahora: 2 }],
    });
    expect(html).not.toContain("Actualizamos tu carrito");
  });
});

describe("CartView — solo líneas no disponibles", () => {
  const html = render({ lines: [line("x", { no_disponible: true })] });

  it("muestra la línea y, en lugar del formulario, el texto que explica por qué", () => {
    expect(html).toContain("Ya no está en el catálogo");
    expect(html).toContain(
      "No hay productos disponibles para generar una orden. Quitá los que ya no están y agregá otros desde el catálogo.",
    );
  });

  it("no hay <form> ni botón de enviar (AC-8)", () => {
    expect(render({ lines: [line("x", { no_disponible: true })], form: <form>FORM</form> })).not.toContain("FORM");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("Enviar orden");
  });
});

describe("CartView — quitar y vaciar", () => {
  it('la fila "Quitaste {nombre}. Deshacer" ocupa la posición de la línea quitada', () => {
    const html = render({
      lines: [line("a"), line("c")],
      undo: { line: line("b"), index: 1 },
    });
    const a = html.indexOf("Producto a");
    const u = html.indexOf("Quitaste Producto b.");
    const c = html.indexOf("Producto c");
    expect(a).toBeGreaterThan(-1);
    expect(u).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(u);
    expect(html).toContain("Deshacer");
  });

  it("si se quitó la última línea: fila de deshacer y el bloque vacío, sin formulario", () => {
    const html = render({ lines: [], undo: { line: line("a"), index: 0 } });
    expect(html).toContain("Quitaste Producto a.");
    expect(html).toContain("Tu carrito está vacío.");
    expect(html).not.toContain("Total (");
  });

  it("confirmar vaciar reemplaza el botón en el mismo lugar (sin confirm() nativo)", () => {
    const html = render({ lines: [line("a")], confirmingClear: true });
    expect(html).toContain("¿Vaciar el carrito?");
    expect(html).toContain("Se quitan todos los productos.");
    expect(html).toContain("Sí, vaciar");
    expect(html).toContain("Cancelar");
    expect(html).not.toContain(">Vaciar carrito<");
  });
});
