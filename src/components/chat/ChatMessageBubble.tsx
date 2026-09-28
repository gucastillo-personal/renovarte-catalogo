/**
 * A single text bubble in the thread (`ux.md` "Accesibilidad" — `sr-only`
 * prefix so the log reads correctly linearized without depending on visual
 * left/right position). Used for the greeting, plain conversational turns,
 * and "sin recomendación" (AC-6) — same shape/styling for all of them, no
 * special error treatment.
 */
export function ChatMessageBubble({
  from,
  text,
  hidden = false,
}: {
  from: "user" | "assistant";
  text: string;
  /** True for the live `text_delta` buffer — visible, but not yet part of the announced log (`ux.md`: "nunca por token"). */
  hidden?: boolean;
}) {
  const isUser = from === "user";
  return (
    <p
      aria-hidden={hidden || undefined}
      data-testid="chat-message-bubble"
      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
        isUser ? "self-end bg-sage-500 text-beige-50" : "self-start bg-beige-100 text-sage-900"
      }`}
    >
      <span className="sr-only">{isUser ? "Vos dijiste: " : "Colibrí respondió: "}</span>
      {text}
    </p>
  );
}
