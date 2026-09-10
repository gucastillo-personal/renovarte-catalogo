const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Format an integer amount of Argentine pesos, e.g. 35280 -> "$ 35.280". */
export function formatARS(amount: number): string {
  return ARS.format(amount);
}
