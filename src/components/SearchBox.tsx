"use client";

export function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <label htmlFor="catalog-search" className="sr-only">
        Buscar producto
      </label>
      <input
        id="catalog-search"
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder="Buscar producto…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-beige-300 bg-white px-3 py-2 pr-9 text-sage-900 placeholder:text-sage-400 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
      />
      {value !== "" && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-lg leading-none text-sage-500 hover:text-sage-800"
        >
          ×
        </button>
      )}
    </div>
  );
}
