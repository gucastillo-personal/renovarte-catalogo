"use client";

import { useChatWidget } from "@/components/chat/ChatProvider";

/**
 * Live region del diálogo (ux.md "Accesibilidad"). El panel es `aria-modal`:
 * los lectores ignoran la región del sitio, así que el anuncio del combo sale
 * de acá. Hermana del hilo y **fuera** del `role="log"`, para no anunciarse
 * dos veces ni como un mensaje nuevo de la conversación.
 */
export function ChatAnnouncer() {
  const { chatAnnouncement } = useChatWidget();
  return (
    <div role="status" aria-live="polite" className="sr-only" data-testid="chat-announcer">
      {chatAnnouncement}
    </div>
  );
}
