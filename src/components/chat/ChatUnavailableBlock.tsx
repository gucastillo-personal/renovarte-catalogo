import { getUnavailableCopy } from "@/lib/chat/budget-copy";

/**
 * "Chat no disponible" (`ux.md` "Estado 'chat no disponible'" — AC-13/
 * RNF-09, RNF-07). `role="status"` (not `alert`): neutral information, not
 * an emergency or a visitor error. Two render sites share this component:
 * `ChatThread` uses it full-size in place of the greeting when nothing has
 * been said yet; `ChatPanel` uses the compact variant above the composer
 * when the cap is hit mid-conversation, leaving the existing thread intact.
 */
export function ChatUnavailableBlock({
  reason,
  compact = false,
}: {
  reason: string | undefined;
  compact?: boolean;
}) {
  const copy = getUnavailableCopy(reason);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="chat-unavailable-block"
      className={`rounded-lg bg-sage-50 text-center ${compact ? "px-4 py-4" : "px-5 py-8"}`}
    >
      <p className="font-display text-lg font-semibold text-sage-800">{copy.heading}</p>
      <p className="mt-2 text-sm text-sage-700">{copy.body}</p>
    </div>
  );
}
