const fmtSoles = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

/** "S/ 1,234.50" */
export const formatearMonto = (n: number) => fmtSoles.format(n);

/** Para ejes: 0 · 500 · 1,000 · 10k */
export function formatearEje(n: number): string {
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1000)}k`;
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(n);
}

/**
 * Lo que se escribe en el campo de monto o llega por URL desde el atajo:
 * "12,50", "12.5", "S/ 12.50". Máximo 2 decimales y mayor que 0.
 */
export function parsearMonto(entrada: string | null | undefined): number | null {
  if (!entrada) return null;
  const t = entrada.trim().replace(/^(s\/\.?|pen)\s*/i, "").replace(/\s+/g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? Math.round(n * 100) / 100 : null;
}

/** Variación porcentual; null si no hay base para comparar. */
export function variacionPct(actual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return ((actual - anterior) / anterior) * 100;
}

export function formatearPct(n: number, decimales = 0): string {
  return `${n.toFixed(decimales)}%`;
}
