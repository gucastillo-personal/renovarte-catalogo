"use client";

import { useChatWidget } from "@/components/chat/ChatProvider";
import { useMounted } from "@/lib/use-mounted";

/**
 * Global floating entry point to the chat (`ux.md` "Punto de entrada 1").
 * Present in the HTML from the first render (mobile: icon only, desktop:
 * icon + "Chat" label) but inert (`tabIndex={-1}`, no accessible name) until
 * hydration completes — same progressive-enhancement pattern as
 * `MissionCarouselLive`'s arrows (`useMounted`, spec 0011), so there's no
 * CLS/flash and the worst case with JS permanently disabled is a visible,
 * non-interactive button rather than a broken one.
 *
 * Never disappears when the chat is unavailable (`ux.md`): it always opens
 * the panel, which is itself responsible for showing the unavailable state.
 */
export function ChatFab() {
  const mounted = useMounted();
  const { openChat } = useChatWidget();

  return (
    <button
      type="button"
      onClick={(event) => openChat(event.currentTarget)}
      aria-label={mounted ? "Abrir chat con Colibrí" : undefined}
      aria-haspopup="dialog"
      tabIndex={mounted ? 0 : -1}
      className={`fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex h-14 items-center gap-2 rounded-full bg-sage-500 px-4 text-beige-50 shadow-lg transition-colors hover:bg-sage-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 ${
        mounted ? "" : "pointer-events-none"
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6 shrink-0"
      >
        <path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" />
      </svg>
      <span className="hidden font-medium sm:inline">Chat</span>
    </button>
  );
}
