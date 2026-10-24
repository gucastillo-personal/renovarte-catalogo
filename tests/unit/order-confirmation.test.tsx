import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OrderConfirmation } from "@/components/orders/OrderConfirmation";
import type { Confirmation } from "@/lib/orders/confirmation-store";

// spec 0017, F15 — confirmación (AC-10, ux.md "Confirmación").

const base: Confirmation = {
  numero_orden: "RA-48271",
  lineas: [
    { nombre: "Crema Humectante", presentacion: "160 g", cantidad: 2, precio: 32160 },
    { nombre: "Tónico", presentacion: "", cantidad: 1, precio: 1000 },
  ],
  total: 65320,
  nombre: "Ana Pérez",
  telefono: "11 5555 5555",
};
const html = (c: Confirmation) => renderToStaticMarkup(<OrderConfirmation confirmation={c} />);

describe("OrderConfirmation", () => {
  const h = html(base);
  const text = h.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  it("h1, número y 'Copiar número'", () => {
    expect(h).toMatch(/<h1[^>]*tabindex="-1"[^>]*>Tu orden fue enviada a RenovArte<\/h1>/i);
    expect(text).toContain("NÚMERO DE ORDEN");
    expect(text).toContain("RA-48271");
    expect(text).toContain("Copiar número");
    expect(text).toContain("Guardalo o sacale una captura: no te vamos a mandar la orden por mail.");
  });

  it("AC-10: 'Qué sigue' con el nombre y el teléfono dados", () => {
    expect(text).toContain("Qué sigue");
    expect(text).toContain(
      "RenovArte va a contactar a Ana Pérez al 11 5555 5555 para coordinar el pago y el envío. En el sitio no se cobra nada.",
    );
  });

  it("canales: tel:, WhatsApp, mailto con asunto e ig.me", () => {
    expect(h).toContain('href="tel:1130579528"');
    expect(h).toContain('href="https://wa.me/5491130579528"');
    expect(h).toContain("mailto:renovartebyjuli@gmail.com?subject=Consulta%20por%20orden%20RA-48271");
    expect(h).toContain('href="https://ig.me/m/renovarte_by_juli"');
    expect(h).toMatch(/ig\.me[^>]*target="_blank"[^>]*rel="noopener"|target="_blank"[^>]*rel="noopener"[^>]*>@renovarte_by_juli/);
    expect(text).toContain("Mencioná el número RA-48271 en tu mensaje.");
  });

  it("'Lo que pediste' con subtotales y total, y 'Volver al catálogo'", () => {
    expect(text).toContain("Lo que pediste");
    expect(text).toContain("Crema Humectante · 160 g × 2");
    expect(text).toMatch(/\$\s64\.320/);
    expect(text).toMatch(/Total \$\s65\.320/);
    expect(h).toMatch(/<a[^>]*href="\/"[^>]*>Volver al catálogo<\/a>/);
  });

  it("un nombre con <script> sale escapado, como texto plano", () => {
    const x = html({ ...base, nombre: "<script>alert(1)</script>" });
    expect(x).not.toContain("<script>");
    expect(x).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("un nombre muy largo corta línea (break-words)", () => {
    const largo = "A".repeat(80);
    const x = html({ ...base, nombre: largo });
    expect(x).toMatch(new RegExp(`class="[^"]*break-words[^"]*">${largo}<`));
  });
});
