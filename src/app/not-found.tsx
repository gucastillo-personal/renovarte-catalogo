import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 py-12">
      <h1 className="text-2xl font-semibold text-sage-900">Página no encontrada</h1>
      <p className="text-sage-600">
        El producto o la página que buscás no existe o fue movida.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-sage-600 underline underline-offset-4 hover:text-sage-800"
      >
        ← Volver al catálogo
      </Link>
    </div>
  );
}
