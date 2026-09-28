import { formatARS } from "@/lib/format";
import type { ComboEntry, ComboNivel } from "@/lib/chat/types";

const NIVEL_LABEL: Record<ComboNivel, string> = {
  mas_barato: "Más barato",
  medio: "Medio",
  premium: "Premium",
};

/**
 * Relation between a combo's total and the visitor's declared budget
 * (`ux.md` "Card de combo" — AC-8/AC-9). Always plain text, never a colored
 * badge — "por encima" for the premium tier is an expected, non-alarming
 * outcome (AC-9), not an error, so it gets the exact same neutral styling
 * as "por debajo".
 */
function relationText(total: number, presupuesto: number, nivel: ComboNivel): string {
  const diff = presupuesto - total;
  if (diff >= 0) {
    return diff === 0
      ? "Coincide con tu presupuesto"
      : `${formatARS(diff)} por debajo de tu presupuesto`;
  }
  const over = total - presupuesto;
  const pct = Math.round((over / presupuesto) * 100);
  if (nivel === "premium") {
    return `${formatARS(over)} (${pct}%) por encima de tu presupuesto — es la opción premium`;
  }
  // Defensive fallback: `barato`/`medio` are guaranteed <= presupuesto by
  // `ai-agent` (AC-8), but a malformed payload should still render
  // something coherent instead of a nonsensical negative amount.
  return `${formatARS(over)} por encima de tu presupuesto`;
}

export function ChatComboCard({
  combo,
  presupuesto,
}: {
  combo: ComboEntry;
  presupuesto: number | undefined;
}) {
  return (
    <li
      className="motion-safe:animate-[chat-combo-in_200ms_ease-out] rounded-lg border border-beige-200 bg-beige-100 p-4"
      data-testid="chat-combo-card"
      data-nivel={combo.nivel}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-sage-600">
        {NIVEL_LABEL[combo.nivel]}
      </h3>

      <ul className="mt-2 flex flex-col gap-2">
        {combo.items.map((item) => (
          <li key={item.producto_id} className="flex items-baseline justify-between gap-3 text-sm">
            <a
              href={`/producto/${item.producto_id}`}
              target="_blank"
              rel="noopener"
              className="text-sage-800 underline decoration-sage-300 underline-offset-2 hover:text-sage-600"
            >
              {item.nombre}
            </a>
            <span className="shrink-0 text-sage-600">
              {item.presentacion} · {formatARS(item.precio_venta)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 border-t border-beige-200 pt-3">
        <p className="text-lg font-semibold text-sage-900">
          <span className="sr-only">Total del combo: </span>
          {formatARS(combo.total)}
        </p>
        {presupuesto !== undefined && (
          <>
            <p className="text-sm text-sage-600">Tu presupuesto: {formatARS(presupuesto)}</p>
            <p className="text-sm text-sage-700">{relationText(combo.total, presupuesto, combo.nivel)}</p>
          </>
        )}
      </div>
    </li>
  );
}
