/**
 * Normalised, typed intermediate for the ingest pipeline (spec 0009).
 *
 * Every source adapter (`sources/csv.ts`, `sources/serlaca-api.ts`) produces
 * `CostRow[]`; the shared core in `run.ts` turns those into public `Product`s.
 * `precio_costo` is already a number and `imagen` is already resolved.
 */
export interface CostRow {
  codigo: string;
  nombre: string;
  categoria: string;
  presentacion: string;
  descripcion: string;
  /**
   * What the product costs RenovArte (the serlaca `price`, con IVA, from a
   * distributor account). The margin is added on top. Consumed by the pipeline,
   * never emitted to `products.json`.
   */
  precio_costo: number;
  en_oferta: boolean;
  tags: string[];
  /** Local `/img/...` path or a remote `https://...` URL. */
  imagen: string;
}
