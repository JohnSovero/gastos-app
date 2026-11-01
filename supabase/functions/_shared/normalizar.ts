// Utilidades puras (sin dependencias) compartidas por la Edge Function y sus tests.

export type Medio = "yape" | "bcp" | "efectivo" | "otro";

export interface Categoria {
  id: string;
  nombre: string;
  activa: boolean;
}

const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000; // Perú: UTC-5 todo el año, sin horario de verano

/** Minúsculas, sin tildes, espacios simples y sin emojis/símbolos al inicio. */
export function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^a-z0-9]+/, "")
    .trim();
}

function milesValidos(s: string, sep: string): boolean {
  const e = sep === "." ? "\\." : ",";
  return new RegExp(`^\\d{1,3}(${e}\\d{3})+$`).test(s);
}

/**
 * Convierte "12,50", "12.5", "S/ 12.50", "1,234.56", "1.234,56" o 12.5 en número.
 * Devuelve null si no es un monto positivo con 2 decimales como máximo.
 */
export function parsearMonto(valor: unknown): number | null {
  if (typeof valor === "number") {
    if (!Number.isFinite(valor) || valor <= 0) return null;
    const centimos = valor * 100;
    if (Math.abs(centimos - Math.round(centimos)) > 1e-6) return null;
    return Math.round(centimos) / 100;
  }
  if (typeof valor !== "string") return null;

  const s = valor.trim().replace(/^(s\/\.?|pen)\s*/i, "").replace(/\s+/g, "");
  if (!/^\d[\d.,]*$/.test(s)) return null;

  const ultimoPunto = s.lastIndexOf(".");
  const ultimaComa = s.lastIndexOf(",");
  let entero: string;
  let decimales = "";

  if (ultimoPunto >= 0 && ultimaComa >= 0) {
    // Ambos separadores: el último es el decimal y el otro es de miles.
    const sep = ultimoPunto > ultimaComa ? "." : ",";
    const miles = sep === "." ? "," : ".";
    const idx = s.lastIndexOf(sep);
    entero = s.slice(0, idx);
    decimales = s.slice(idx + 1);
    if (entero.includes(sep) || !milesValidos(entero, miles)) return null;
    entero = entero.split(miles).join("");
  } else if (ultimoPunto >= 0 || ultimaComa >= 0) {
    const sep = ultimoPunto >= 0 ? "." : ",";
    const partes = s.split(sep);
    const pareceMiles = partes.length > 2 ||
      (partes[1].length === 3 && partes[0] !== "0");
    if (pareceMiles) {
      if (!milesValidos(s, sep)) return null;
      entero = partes.join("");
    } else {
      [entero, decimales] = partes;
    }
  } else {
    entero = s;
  }

  if (!/^\d+$/.test(entero) || !/^\d{0,2}$/.test(decimales)) return null;
  const n = Number(decimales ? `${entero}.${decimales}` : entero);
  if (!(n > 0) || n >= 1e10) return null;
  return Math.round(n * 100) / 100;
}

/** Nombre sin el detalle entre paréntesis: "Servicios (luz, agua…)" → "Servicios". */
export function nombreCorto(nombre: string): string {
  return nombre.replace(/\s*\(.*\)\s*$/, "").trim();
}

/** Busca por id, nombre completo o nombre corto. Acepta "Pago de tarjeta de crédito". */
export function buscarCategoria<C extends Categoria>(entrada: string, categorias: C[]): C | null {
  const n = normalizarTexto(entrada).replace(/^pago (de )?(la )?/, "");
  if (!n) return null;
  for (const c of categorias) {
    const claves = [c.id, c.nombre, nombreCorto(c.nombre)].map(normalizarTexto);
    if (claves.includes(n)) return c;
  }
  return null;
}

const MEDIOS: Record<string, Medio> = {
  yape: "yape",
  bcp: "bcp",
  "banca movil bcp": "bcp",
  "banca movil": "bcp",
  efectivo: "efectivo",
  otro: "otro",
  otros: "otro",
};

export function normalizarMedio(entrada: string): Medio | null {
  return MEDIOS[normalizarTexto(entrada)] ?? null;
}

export const ETIQUETA_MEDIO: Record<Medio, string> = {
  yape: "Yape",
  bcp: "BCP",
  efectivo: "Efectivo",
  otro: "Otro",
};

/**
 * Interpreta una fecha ISO 8601. Si no trae zona horaria se asume hora de Lima.
 * Devuelve null si no es válida.
 */
export function parsearFecha(entrada: string): Date | null {
  let s = entrada.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += "T00:00:00";
  const tieneZona = /(Z|[+-]\d{2}:?\d{2})$/i.test(s);
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s) && !tieneZona) s += "-05:00";
  const d = new Date(s.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Inicio y fin (exclusivo) del mes calendario de Lima que contiene `ahora`, en ISO UTC. */
export function rangoMesLima(ahora: Date): { desde: string; hasta: string } {
  const lima = new Date(ahora.getTime() - LIMA_OFFSET_MS);
  const y = lima.getUTCFullYear();
  const m = lima.getUTCMonth();
  return {
    desde: new Date(Date.UTC(y, m, 1, 5)).toISOString(),
    hasta: new Date(Date.UTC(y, m + 1, 1, 5)).toISOString(),
  };
}

/** "S/ 1,234.50" — formato fijo para que el atajo lo muestre igual siempre. */
export function formatearSoles(n: number): string {
  const [e, d] = n.toFixed(2).split(".");
  return `S/ ${e.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${d}`;
}

/** Compara el token en tiempo constante (hash SHA-256 de ambos y XOR byte a byte). */
export async function tokenValido(recibido: string | null, esperado: string | undefined): Promise<boolean> {
  if (!recibido || !esperado) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(recibido)),
    crypto.subtle.digest("SHA-256", enc.encode(esperado)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
