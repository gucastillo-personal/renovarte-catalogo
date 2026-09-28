"use client";

import { useChatWidget } from "@/components/chat/ChatProvider";
import { CHAT_TITLE } from "@/lib/chat/content";

/** Sticky header (`ux.md` "El panel de chat" — `h-14`): title + close button. */
export function ChatHeader() {
  const { closeChat } = useChatWidget();

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-beige-200 bg-beige-100 px-4">
      <h2 id="chat-title" className="font-display text-lg font-semibold text-sage-800">
        {CHAT_TITLE}
      </h2>
      <button
        type="button"
        onClick={closeChat}
        aria-label="Cerrar chat"
        className="flex h-9 w-9 items-center justify-center rounded-full text-sage-700 transition-colors hover:bg-sage-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
