"use client";

import { useRef } from "react";

import { useChatWidget } from "@/components/chat/ChatProvider";
import { getUnavailableCopy } from "@/lib/chat/budget-copy";
import { CHAT_COMPOSER_PLACEHOLDER } from "@/lib/chat/content";
import { isComposerDisabled } from "@/lib/chat/reducer";

/** Max textarea height (~4 lines, `ux.md` "El panel de chat" > input sticky). */
const MAX_TEXTAREA_HEIGHT_PX = 96;

/**
 * Auto-expanding textarea + circular send button (`ux.md` "El panel de
 * chat" / "Streaming / carga"). Disabled while a turn is in flight or the
 * chat is unavailable (T13) — in the unavailable case the placeholder also
 * switches to the dedicated copy so the composer never looks "just broken".
 */
export function ChatComposer() {
  const { state, sendMessage, draftText, setDraftText, registerComposerElement } = useChatWidget();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const disabled = isComposerDisabled(state);
  const placeholder =
    state.phase === "unavailable"
      ? getUnavailableCopy(state.unavailableReason).placeholder
      : state.composerPlaceholder || CHAT_COMPOSER_PLACEHOLDER;

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }

  function submit() {
    if (disabled) return;
    if (draftText.trim().length === 0) return;
    sendMessage(draftText);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
    }
  }

  return (
    <div className="flex shrink-0 items-end gap-2 border-t border-beige-200 bg-beige-100 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <textarea
        ref={(el) => {
          textareaRef.current = el;
          registerComposerElement(el);
        }}
        value={draftText}
        onChange={(event) => {
          setDraftText(event.target.value);
          autoResize(event.currentTarget);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        aria-label="Mensaje para Colibrí"
        className="max-h-24 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-beige-200 bg-beige-50 px-3 py-2 text-sm text-sage-900 placeholder:text-sage-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 disabled:bg-beige-100 disabled:text-sage-400"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || draftText.trim().length === 0}
        aria-label="Enviar mensaje"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-500 text-beige-50 transition-colors hover:bg-sage-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 disabled:bg-sage-300"
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
          <path d="M4 12h15" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
