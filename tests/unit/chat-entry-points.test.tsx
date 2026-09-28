import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";
import { ChatProvider } from "@/components/chat/ChatProvider";

// spec 0016 — Colibrí entry points: `ChatFab` (T7) and `ChatHomeInviteCard`
// (T8), both inert-until-hydrated (same `useMounted` pattern as
// `MissionCarouselLive`, spec 0011) and both rendered through `ChatProvider`
// exactly as `layout.tsx` does in production, not in isolation.

describe("ChatFab (T7) — present in the HTML base, inert until hydrated", () => {
  const html = renderToStaticMarkup(
    <ChatProvider>
      <div />
    </ChatProvider>,
  );

  it("renders the FAB button (with its icon) in the static HTML", () => {
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("<svg");
  });

  it("has tabindex=-1 and no aria-label before hydration (mirrors MissionCarouselLive's arrows)", () => {
    const fabMatch = html.match(/<button[^>]*aria-haspopup="dialog"[^>]*>/);
    expect(fabMatch).not.toBeNull();
    const fabHtml = fabMatch![0];
    expect(fabHtml).toContain('tabindex="-1"');
    expect(fabHtml).not.toContain("aria-label");
  });

  it("carries the 'Chat' label (desktop) and the icon (mobile) — same trigger for both breakpoints", () => {
    expect(html).toContain(">Chat<");
  });

  it("the chat panel is not in the DOM while closed (initial state)", () => {
    expect(html).not.toContain('role="dialog"');
  });
});

describe("ChatHomeInviteCard (T8) — exact position in the home DOM order", () => {
  const html = renderToStaticMarkup(
    <ChatProvider>
      <Home />
    </ChatProvider>,
  );

  it("sits between the mission section's divider and the 'Catálogo' heading", () => {
    const dividerIndex = html.indexOf('class="my-10 border-t border-beige-200 sm:my-16"');
    const inviteIndex = html.indexOf("Iniciar chat");
    const catalogoIndex = html.indexOf(">Catálogo<");

    expect(dividerIndex).toBeGreaterThan(-1);
    expect(inviteIndex).toBeGreaterThan(dividerIndex);
    expect(catalogoIndex).toBeGreaterThan(inviteIndex);
  });

  it("has its own inert-until-hydrated trigger button (same pattern as the FAB)", () => {
    const buttonMatch = html.match(/<button[^>]*aria-haspopup="dialog"[^>]*>Iniciar chat<\/button>/);
    expect(buttonMatch).not.toBeNull();
    expect(buttonMatch![0]).toContain('tabindex="-1"');
  });
});
