"use client";

import { useEffect, useRef } from "react";

import { ChatComboList } from "@/components/chat/ChatComboList";
import { useChatWidget } from "@/components/chat/ChatProvider";
import { ChatExampleChips } from "@/components/chat/ChatExampleChips";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { ChatUnavailableBlock } from "@/components/chat/ChatUnavailableBlock";
import { CHAT_GREETING, CHAT_TYPING_ANNOUNCEMENT } from "@/lib/chat/content";

function TypingDots() {
  return (
    <div role="status" data-testid="chat-typing-indicator" className="flex w-fit gap-1 self-start rounded-lg bg-beige-100 px-3 py-2.5">
      <span className="sr-only">{CHAT_TYPING_ANNOUNCEMENT}</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="h-2 w-2 rounded-full bg-sage-300 motion-safe:animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

/**
 * The scrollable message area (`ux.md` "El panel de chat" / "Accesibilidad").
 * `role="log"` covers only announceable content (greeting + flushed
 * messages) — the live `text_delta` buffer and the "escribiendo" indicator
 * live outside it, exactly as `ux.md` "Accesibilidad" requires ("nunca por
 * token").
 *
 * Handles all 3 documented thread states (`ux.md` "Estados y
 * responsividad"): normal (greeting/chips/messages), the >400ms handshake
 * delay (dots replace the greeting), and "no disponible" discovered before
 * any message exists (the block replaces the greeting entirely — the
 * mid-conversation variant is `ChatPanel`'s job, since the thread there
 * stays untouched).
 */
export function ChatThread() {
  const { state } = useChatWidget();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [state.messages.length, state.streamingText, state.isAssistantTyping]);

  const hasMessages = state.messages.length > 0;

  if (state.phase === "unavailable" && !hasMessages) {
    return (
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <ChatUnavailableBlock reason={state.unavailableReason} />
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-3">
        {state.phase === "connecting_slow" && !hasMessages ? (
          <TypingDots />
        ) : (
          <>
            <div
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Conversación con Colibrí"
              className="flex flex-col gap-3"
            >
              <ChatMessageBubble from="assistant" text={CHAT_GREETING} />
              {state.messages.map((message) => {
                if (message.kind === "user") {
                  return <ChatMessageBubble key={message.id} from="user" text={message.text} />;
                }
                if (message.kind === "assistant_text") {
                  return <ChatMessageBubble key={message.id} from="assistant" text={message.text} />;
                }
                if (message.kind === "no_recommendation") {
                  return (
                    <ChatMessageBubble key={message.id} from="assistant" text={message.mensaje} />
                  );
                }
                return (
                  <ChatComboList
                    key={message.id}
                    combos={message.combos}
                    presupuesto={message.presupuesto}
                  />
                );
              })}
            </div>

            {state.showExampleChips && <ChatExampleChips />}

            {state.streamingText.length > 0 && (
              <ChatMessageBubble from="assistant" text={state.streamingText} hidden />
            )}
            {state.isAssistantTyping && <TypingDots />}
          </>
        )}
      </div>
    </div>
  );
}
