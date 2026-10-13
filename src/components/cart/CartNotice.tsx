export interface CartNoticeProps {
  title: string;
  items?: readonly string[];
}

/** Aviso neutro `sage-50` (ux.md "Revalidación"): informativo, sin rojo, `role="status"`. */
export function CartNotice({ title, items = [] }: CartNoticeProps) {
  return (
    <div role="status" className="rounded-lg bg-sage-50 p-4 text-sage-800">
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
