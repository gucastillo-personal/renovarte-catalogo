"use client";

import { useChatWidget } from "@/components/chat/ChatProvider";
import { CHAT_CHANGE_PROFILE_LABEL } from "@/lib/chat/content";
import { formatARS } from "@/lib/format";

/**
 * Read-only summary chip of captured `tipo_piel`/`presupuesto` + "Cambiar"
 * (`ux.md` "Confirmación no ambigua de lo capturado" — AC-2). Only appears
 * once **both** values are confirmed (a single value alone stays implicit
 * in the conversation, per `ux.md`), and updates in place rather than
 * duplicating on every `profile_confirmed` (guaranteed by the reducer's
 * merge, not by anything here).
 */
export function ChatProfileBar() {
  const { state, requestChangeProfile } = useChatWidget();
  const { tipoPiel, presupuesto } = state.profile;

  if (tipoPiel === undefined || presupuesto === undefined) return null;

  return (
    <div
      data-testid="chat-profile-bar"
      className="flex shrink-0 items-center justify-between gap-2 border-b border-beige-200 bg-beige-100 px-4 py-2 text-sm"
    >
      <span className="text-sage-700">
        Piel: {tipoPiel} · Presupuesto: {formatARS(presupuesto)}
      </span>
      <button
        type="button"
        onClick={requestChangeProfile}
        aria-label={CHAT_CHANGE_PROFILE_LABEL}
        className="shrink-0 font-medium text-sage-700 underline underline-offset-2 hover:text-sage-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
      >
        Cambiar
      </button>
    </div>
  );
}
