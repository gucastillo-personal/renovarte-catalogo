import { ChatComboCard } from "@/components/chat/ChatComboCard";
import type { ComboEntry } from "@/lib/chat/types";

/**
 * The 3-combo recommendation turn (`ux.md` "Card de combo" / AC-3, AC-5,
 * AC-7). An `<ol>` so assistive tech announces "1 of 3" etc. — the level
 * labels are text (`ChatComboCard`'s `<h3>`), ordering itself carries the
 * ascending-price guarantee `ai-agent` already produced (AC-5), this
 * component never re-sorts.
 */
export function ChatComboList({
  combos,
  presupuesto,
}: {
  combos: [ComboEntry, ComboEntry, ComboEntry];
  presupuesto: number | undefined;
}) {
  return (
    <ol className="flex flex-col gap-3" data-testid="chat-combo-list">
      {combos.map((combo, index) => (
        <ChatComboCard key={`${combo.nivel}-${index}`} combo={combo} presupuesto={presupuesto} />
      ))}
    </ol>
  );
}
