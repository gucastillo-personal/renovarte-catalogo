"use client";

import { useChatWidget } from "@/components/chat/ChatProvider";
import { useMounted } from "@/lib/use-mounted";

/**
 * Home-only invitation card (`ux.md` "Punto de entrada 2"), wired into
 * `src/app/page.tsx` between the existing `border-t` divider and the
 * "Catálogo" heading. Shares the exact same `openChat()` trigger as
 * `ChatFab` — no separate state, no separate panel (`ux.md`: "Mismo
 * componente trigger que el FAB — un solo `onClick` compartido").
 *
 * Same inert-until-hydrated pattern as `ChatFab`/`MissionCarouselLive`: the
 * card and its button are in the HTML from the first render, the button
 * just isn't interactive until `useMounted()` flips.
 */
export function ChatHomeInviteCard() {
  const mounted = useMounted();
  const { openChat } = useChatWidget();

  return (
    <div className="rounded-lg border border-beige-200 bg-beige-100 px-4 py-5 sm:px-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sage-800">
          ¿No sabés qué crema elegir? Contale a Colibrí tu tipo de piel y tu presupuesto.
        </p>
        <button
          type="button"
          onClick={(event) => openChat(event.currentTarget)}
          aria-label={mounted ? "Iniciar chat con Colibrí" : undefined}
          aria-haspopup="dialog"
          tabIndex={mounted ? 0 : -1}
          className={`shrink-0 rounded-lg bg-sage-500 px-4 py-2 font-medium text-beige-50 transition-colors hover:bg-sage-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 ${
            mounted ? "" : "pointer-events-none"
          }`}
        >
          Iniciar chat
        </button>
      </div>
    </div>
  );
}
