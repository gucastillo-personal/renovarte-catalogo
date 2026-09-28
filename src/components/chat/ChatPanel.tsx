"use client";

import { useEffect, useRef } from "react";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { useChatWidget } from "@/components/chat/ChatProvider";
import { ChatProfileBar } from "@/components/chat/ChatProfileBar";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatUnavailableBlock } from "@/components/chat/ChatUnavailableBlock";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * The chat panel shell (`ux.md` "El panel de chat"): `role="dialog"
 * aria-modal="true"`, mobile full-screen / desktop 420px drawer + scrim,
 * trapped focus, Escape/scrim/× all close and return focus to the exact
 * trigger that opened it (`ux.md` "Accesibilidad").
 *
 * Renders `null` while closed — the rest of the site (grid, nav, footer)
 * lives entirely outside this component and is never touched by it, which
 * is what keeps AC-11 true structurally.
 */
export function ChatPanel() {
  const { state, closeChat } = useChatWidget();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = getFocusable(panel);
    (focusables[0] ?? panel).focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeChat();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = getFocusable(panel);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state.isOpen, closeChat]);

  if (!state.isOpen) return null;

  const midConversationUnavailable = state.phase === "unavailable" && state.messages.length > 0;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={closeChat}
        data-testid="chat-scrim"
        className="fixed inset-0 z-40 hidden bg-sage-900/10 md:block motion-reduce:transition-none"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-title"
        data-testid="chat-panel"
        className="fixed inset-0 z-50 flex flex-col bg-beige-50 md:inset-y-0 md:right-0 md:left-auto md:w-[420px] md:max-w-[90vw] md:border-l md:border-beige-200 motion-reduce:transition-none"
      >
        <ChatHeader />
        <ChatProfileBar />
        <ChatThread />
        {midConversationUnavailable && (
          <div className="shrink-0 px-4 pt-3">
            <ChatUnavailableBlock reason={state.unavailableReason} compact />
          </div>
        )}
        <ChatComposer />
      </div>
    </>
  );
}
