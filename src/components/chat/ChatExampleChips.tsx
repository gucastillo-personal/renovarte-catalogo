"use client";

import { useChatWidget } from "@/components/chat/ChatProvider";
import { CHAT_EXAMPLE_PROMPTS } from "@/lib/chat/content";
import { CHIP, INACTIVE } from "@/lib/chip-styles";

/**
 * 2–3 example prompts that autocomplete the composer without sending
 * (`ux.md` "Arranque de la conversación"). Only rendered by `ChatThread`
 * while `state.showExampleChips` is true (hides after the visitor's first
 * message) — same chip tokens as `CategoryNav`/`chip-styles.ts`.
 */
export function ChatExampleChips() {
  const { setDraftText } = useChatWidget();

  return (
    <div className="flex flex-wrap gap-2" aria-label="Ejemplos de mensaje">
      {CHAT_EXAMPLE_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => setDraftText(prompt)}
          className={`${CHIP} ${INACTIVE}`}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
