import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormErrorSummary } from "@/components/orders/FormErrorSummary";
import { OrderForm } from "@/components/orders/OrderForm";

// spec 0017, F12 — formulario "Tus datos" (ux.md "Formulario", AC-9, AC-12, AC-19; ADR-0020).

/**
 * Nombres de atributo en minúscula: el HTML los trata sin distinguir
 * mayúsculas, pero React imprime algunos en camelCase (`autoComplete`,
 * `inputMode`, `enterKeyHint`, `maxLength`, `noValidate`).
 */
function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node).replace(
    /\s([a-zA-Z]+)=/g,
    (_all, attr: string) => ` ${attr.toLowerCase()}=`,
  );
}

const html = render(<OrderForm storage={null} />);

function tag(source: string, re: RegExp): string {
  const m = source.match(re);
  expect(m, String(re)).not.toBeNull();
  return m![0];
}

const inputs = [...html.matchAll(/<input[^>]*>/g)].map((m) => m[0]);

describe("OrderForm — campos (AC-9)", () => {
  it("tiene <form novalidate> y no usa fieldset ni legend", () => {
    expect(html).toMatch(/<form[^>]*\snovalidate=""/);
    expect(html).not.toContain("<fieldset");
    expect(html).not.toContain("<legend");
  });

  it("dos campos visibles, en el orden nombre, teléfono (más el honeypot)", () => {
    const names = inputs.map((i) => i.match(/name="([^"]+)"/)?.[1]);
    expect(names).toEqual(["nombre", "telefono", "sitio_web"]);
  });

  it("nombre: atributos de ux.md", () => {
    const i = tag(html, /<input[^>]*name="nombre"[^>]*>/);
    expect(i).toContain('type="text"');
    expect(i).toContain('autocomplete="name"');
    expect(i).toContain('autocapitalize="words"');
    expect(i).toContain('spellcheck="false"');
    expect(i).toContain('enterkeyhint="next"');
    expect(i).toContain('maxlength="80"');
  });

  it("teléfono: atributos de ux.md", () => {
    const i = tag(html, /<input[^>]*name="telefono"[^>]*>/);
    expect(i).toContain('type="tel"');
    expect(i).toContain('autocomplete="tel"');
    expect(i).toContain('inputmode="tel"');
    expect(i).toContain('enterkeyhint="done"');
  });

  it("labels visibles asociados por for/id, y ningún placeholder", () => {
    for (const [label, name] of [
      ["Nombre y apellido", "nombre"],
      ["Teléfono", "telefono"],
    ]) {
      const id = tag(html, new RegExp(`<input[^>]*name="${name}"[^>]*>`)).match(/\sid="([^"]+)"/)![1];
      expect(html).toMatch(new RegExp(`<label[^>]*for="${id!.replace(/:/g, ":")}"[^>]*>${label}</label>`));
    }
    expect(html).not.toContain("placeholder");
  });

  it("hints textuales, asociados con aria-describedby", () => {
    expect(html).toContain("Para saber a quién llamar. Ej.: Ana Pérez");
    expect(html).toContain("Con código de área. Ej.: 11 5555 5555");
    for (const name of ["nombre", "telefono"]) {
      const i = tag(html, new RegExp(`<input[^>]*name="${name}"[^>]*>`));
      const describedby = i.match(/aria-describedby="([^"]+)"/)![1]!;
      expect(html).toContain(`id="${describedby}"`);
      expect(i).not.toContain("aria-invalid");
    }
  });

  it("título, bajada y botón", () => {
    expect(html).toMatch(/<h2[^>]*>Tus datos<\/h2>/);
    expect(html).toContain(
      "Solo necesitamos tu nombre y tu teléfono. Te llamamos o te escribimos para coordinar el pago y el envío.",
    );
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Enviar orden<\/button>/);
  });

  it("sin email, dirección, localidad ni aviso de privacidad", () => {
    expect(html).not.toMatch(/name="(email|direccion|localidad)"/);
    expect(html).not.toMatch(/type="email"/);
    expect(html.toLowerCase()).not.toContain("privacidad");
    expect(html).not.toContain('type="checkbox"');
  });
});

describe("OrderForm — sin pago, envío, cupón ni comentario (AC-12)", () => {
  it("los únicos campos de datos son nombre y teléfono", () => {
    expect(html).not.toContain("<textarea");
    expect(html).not.toContain("<select");
    expect(html).not.toMatch(/name="(pago|tarjeta|envio|cupon|comentario|notas|mensaje)"/);
    expect(html).not.toMatch(/autocomplete="cc-/i);
    const visibles = inputs.filter((i) => !i.includes('name="sitio_web"'));
    expect(visibles).toHaveLength(2);
  });
});

describe("OrderForm — honeypot (AC-19)", () => {
  const wrapper = tag(html, /<div[^>]*aria-hidden="true"[^>]*>/);
  const hp = tag(html, /<input[^>]*name="sitio_web"[^>]*>/);

  it("está en un wrapper aria-hidden y fuera de pantalla", () => {
    expect(wrapper).toContain("-left-[9999px]");
    expect(html.indexOf(wrapper)).toBeLessThan(html.indexOf(hp));
  });

  it("tabindex -1, autocomplete off y vacío", () => {
    expect(hp).toContain('tabindex="-1"');
    expect(hp).toContain('autocomplete="off"');
    expect(hp).toMatch(/value=""/);
  });
});

describe("OrderForm — errores del servidor ya mapeados", () => {
  it("un ítem por campo, en el orden del formulario, con el copy textual y aria-invalid", () => {
    const out = render(
      <OrderForm
        storage={null}
        serverErrors={[
          { campo: "telefono", codigo: "formato" },
          { campo: "nombre", codigo: "requerido" },
        ]}
      />,
    );
    expect(out).toContain("Revisá estos datos antes de enviar:");
    const iNombre = out.indexOf("Dejanos tu nombre y apellido para saber a quién llamar.");
    const iTel = out.indexOf("Revisá el teléfono: escribilo con código de área, solo números (ej.: 11 5555 5555).");
    expect(iNombre).toBeGreaterThan(-1);
    expect(iTel).toBeGreaterThan(iNombre);
    expect(tag(out, /<input[^>]*name="nombre"[^>]*>/)).toContain('aria-invalid="true"');
    expect(tag(out, /<input[^>]*name="telefono"[^>]*>/)).toContain('aria-invalid="true"');
    // hint y error, en ese orden.
    const desc = tag(out, /<input[^>]*name="nombre"[^>]*>/).match(/aria-describedby="([^"]+)"/)![1]!;
    expect(desc.split(" ")).toHaveLength(2);
    expect(desc.split(" ")[0]).toMatch(/hint$/);
    expect(desc.split(" ")[1]).toMatch(/error$/);
  });

  it("contacto.nombre largo/formato → el copy 'Revisá el nombre…'", () => {
    const out = render(
      <OrderForm storage={null} serverErrors={[{ campo: "nombre", codigo: "formato" }]} />,
    );
    expect(out).toContain("Revisá el nombre: escribilo con letras y hasta 80 caracteres (ej.: Ana Pérez).");
  });

  it("el error general ocupa el lugar del resumen y no coexiste con él", () => {
    const solo = render(<OrderForm storage={null} generalError={<p>GENERAL</p>} />);
    expect(solo).toContain("GENERAL");
    expect(solo).not.toContain("Revisá estos datos antes de enviar:");
    const ambos = render(
      <OrderForm
        storage={null}
        generalError={<p>GENERAL</p>}
        serverErrors={[{ campo: "nombre", codigo: "requerido" }]}
      />,
    );
    expect(ambos).not.toContain("GENERAL");
    expect(ambos).toContain("Revisá estos datos antes de enviar:");
  });

  it("rehidrata el borrador desde el storage", () => {
    const storage = {
      getItem: () => JSON.stringify({ nombre: "Ana Pérez", telefono: "11 5555 5555" }),
      setItem: () => {},
      removeItem: () => {},
    };
    const out = render(<OrderForm storage={storage} />);
    expect(tag(out, /<input[^>]*name="nombre"[^>]*>/)).toContain('value="Ana Pérez"');
    expect(tag(out, /<input[^>]*name="telefono"[^>]*>/)).toContain('value="11 5555 5555"');
  });
});

describe("FormErrorSummary", () => {
  const out = render(
    <FormErrorSummary
      errores={[
        { campo: "nombre", codigo: "requerido" },
        { campo: "telefono", codigo: "requerido" },
      ]}
      onFocusCampo={() => {}}
    />,
  );

  it("contenedor enfocable por código, etiquetado por su título", () => {
    expect(out).toMatch(/^<div[^>]*tabindex="-1"/);
    const labelled = out.match(/aria-labelledby="([^"]+)"/)![1]!;
    expect(out).toContain(`id="${labelled}"`);
  });

  it("cada ítem es un botón, en el orden dado", () => {
    const botones = [...out.matchAll(/<button[^>]*type="button"[^>]*>([^<]*)<\/button>/g)].map((m) => m[1]);
    expect(botones).toEqual([
      "Dejanos tu nombre y apellido para saber a quién llamar.",
      "Dejanos un teléfono para contactarte.",
    ]);
  });
});

describe("OrderForm — enviando (F13, ux.md 'Enviar la orden')", () => {
  const sending = render(<OrderForm storage={null} enviando />);

  it("nombre y teléfono readonly, botón 'Enviando orden…' con aria-disabled y aviso de no cerrar", () => {
    const ins = [...sending.matchAll(/<input[^>]*>/g)].map((m) => m[0]);
    expect(ins.find((i) => i.includes('name="nombre"'))).toMatch(/\sreadonly=""/);
    expect(ins.find((i) => i.includes('name="telefono"'))).toMatch(/\sreadonly=""/);
    expect(sending).toMatch(/<button[^>]*aria-disabled="true"[^>]*>Enviando orden…<\/button>/);
    expect(sending).toContain("Estamos enviando tu orden a RenovArte. No cierres esta página.");
  });

  it("sin enviar: inputs editables y botón 'Enviar orden'", () => {
    expect(html).not.toMatch(/\sreadonly=""/);
    expect(html).toContain(">Enviar orden</button>");
    expect(html).not.toContain("aria-disabled");
  });

  it("el banner de falla va arriba del botón y no se muestra mientras se envía", () => {
    const f = render(<OrderForm storage={null} banner={{ variant: "falla", detalle: "x" }} />);
    expect(f.indexOf("Reintentar envío")).toBeGreaterThan(-1);
    expect(f.indexOf("Reintentar envío")).toBeLessThan(f.indexOf(">Enviar orden</button>"));
    const g = render(<OrderForm storage={null} enviando banner={{ variant: "falla", detalle: "x" }} />);
    expect(g).not.toContain("Reintentar envío");
  });
});
