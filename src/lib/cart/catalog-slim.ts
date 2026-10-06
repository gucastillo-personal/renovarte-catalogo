import type { Product } from "@/lib/types";

/**
 * Lo único del catálogo que llega a `/carrito` (AC-16): una proyección por
 * allowlist de 5 campos, nunca el `Product` completo. Así ni un campo nuevo
 * del catálogo viaja al navegador sin querer.
 */
export interface CartCatalogEntry {
  id: string;
  nombre: string;
  presentacion: string;
  imagen: string;
  precio_venta: number;
}

/** Catálogo reducido, por `id`. */
export type CartCatalog = Readonly<Record<string, CartCatalogEntry>>;

export function toCartCatalogEntry(p: Product): CartCatalogEntry {
  return {
    id: p.id,
    nombre: p.nombre,
    presentacion: p.presentacion,
    imagen: p.imagen,
    precio_venta: p.precio_venta,
  };
}

export function toCartCatalog(products: readonly Product[]): CartCatalog {
  const out: Record<string, CartCatalogEntry> = {};
  for (const p of products) out[p.id] = toCartCatalogEntry(p);
  return out;
}
