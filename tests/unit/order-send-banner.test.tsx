import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ContactChannels } from "@/components/orders/ContactChannels";
import { OrderSendBanner } from "@/components/orders/OrderSendBanner";

// spec 0017, F13 — banners de "orden no enviada" (ux.md "Estados y responsividad", AC-20, AC-22).

const strip = (h: string) => h.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const banner = (v: Parameters<typeof OrderSendBanner>[0]["variant"], onRetry?: () => void) =>
  renderToStaticMarkup(<OrderSendBanner variant={v} detalle="Pedido RenovArte" onRetry={onRetry} />);

describe("OrderSendBanner", () => {
  it("falla: role=alert, foco en el contenedor, 'Reintentar envío', canales y copiar detalle", () => {
    const h = banner("falla", () => {});
    expect(h).toMatch(/role="alert"[^>]*tabindex="-1"|tabindex="-1"[^>]*role="alert"/i);
    const t = strip(h);
    expect(t).toContain("Tu orden no se envió");
    expect(t).toContain(
      "No pudimos comunicarnos con RenovArte. Tu carrito y tus datos siguen acá: podés intentar de nuevo.",
    );
    expect(t).toContain("Reintentar envío");
    expect(t).toContain("Si sigue sin funcionar, podés hacer el pedido por teléfono, email o Instagram:");
    expect(t).toContain("Copiar detalle del pedido");
    expect(t).not.toContain("Para pegarlo en tu mensaje.");
  });

  it("tope: sin 'Reintentar', con canales, copiar detalle y su nota", () => {
    const t = strip(banner("tope"));
    expect(t).toContain("Tu orden no se envió");
    expect(t).toContain("Este mes llegamos al límite de órdenes");
    expect(t).not.toContain("Reintentar");
    expect(t).toContain("Copiar detalle del pedido");
    expect(t).toContain("Para pegarlo en tu mensaje.");
  });

  it("tope al entrar: otro título, role=status, sin foco y sin 'Reintentar'", () => {
    const h = banner("tope-entrada");
    expect(h).toContain('role="status"');
    expect(h).not.toContain("tabindex");
    const t = strip(h);
    expect(t).toContain("Por ahora no podemos recibir órdenes desde el sitio");
    expect(t).not.toContain("Tu orden no se envió");
    expect(t).not.toContain("Reintentar");
    expect(t).toContain("Este mes llegamos al límite");
  });

  it("general: copy de 'no pasó la revisión', sin 'Reintentar', sin jerga", () => {
    const h = banner("general", () => {});
    const t = strip(h);
    expect(h).toContain('role="alert"');
    expect(t).toContain("Algo de lo que enviaste no pasó la revisión.");
    expect(t).not.toContain("Reintentar");
    expect(t).not.toMatch(/honeypot|clave|payload|inválid/i);
    expect(t).toContain("Copiar detalle del pedido");
  });
});

describe("ContactChannels", () => {
  it("teléfono con tel: y WhatsApp, email con mailto, Instagram en pestaña nueva, y Copiar", () => {
    const h = renderToStaticMarkup(<ContactChannels />);
    expect(h).toContain('href="tel:1130579528"');
    expect(h).toContain('href="https://wa.me/5491130579528"');
    expect(h).toContain('href="mailto:renovartebyjuli@gmail.com"');
    expect(h).toMatch(/href="https:\/\/ig\.me\/m\/renovarte_by_juli"[^>]*target="_blank"[^>]*rel="noopener"/);
    expect(h.match(/>Copiar</g)?.length).toBe(2);
  });
});
