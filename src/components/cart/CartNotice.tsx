import type { Ref } from "react";

export interface CartNoticeProps {
  title: string;
  /** Para el aviso de "precios actualizados" (AC-15): el foco va ahí, con `tabIndex={-1}`. */
  ref?: Ref<HTMLDivElement>;
  focusable?: boolean;
  items?: readonly string[];
}

/** Aviso neutro `sage-50` (ux.md "Revalidación"): informativo, sin rojo, `role="status"`. */
export function CartNotice({ title, items = [], ref, focusable = false }: CartNoticeProps) {
  return (
    <div
      ref={ref}
      role="status"
      tabIndex={focusable ? -1 : undefined}
      className="rounded-lg bg-sage-50 p-4 text-sage-800 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
    >
      <p className="font-semibold">{title}</p>
      {items.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-sm text-sage-700">
          {items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
