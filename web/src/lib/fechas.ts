// Fechas en hora de Lima. Una "fecha" (sin hora) se maneja como texto "AAAA-MM-DD"
// que ya representa un día de Lima; para mostrarla se formatea en UTC para no
// volver a desplazarla.

export const ZONA = "America/Lima";
export type Granularidad = "dia" | "semana" | "mes";

const fmtDiaISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const fmtPartes = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const fmtHora = new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fmtFechaHora = new Intl.DateTimeFormat("es-PE", {
  timeZone: ZONA,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const fmtDiaLargo = new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const fmtDiaMes = new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", day: "numeric", month: "short" });
const fmtMes = new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", month: "short" });
const fmtMesAnio = new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", month: "long", year: "numeric" });

function aUTC(f: string): Date {
  const [y, m, d] = f.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
const deUTC = (d: Date) => d.toISOString().slice(0, 10);
const sinPunto = (s: string) => s.replace(/\./g, "");

/** Día de Lima ("AAAA-MM-DD") de un instante. */
export function diaLima(instante: Date | string = new Date()): string {
  return fmtDiaISO.format(typeof instante === "string" ? new Date(instante) : instante);
}

export function sumarDias(f: string, n: number): string {
  const d = aUTC(f);
  d.setUTCDate(d.getUTCDate() + n);
  return deUTC(d);
}

/** Primer día del mes desplazado `n` meses. */
export function sumarMeses(f: string, n: number): string {
  const [y, m] = f.split("-").map(Number);
  return deUTC(new Date(Date.UTC(y, m - 1 + n, 1)));
}

export const inicioMes = (f: string) => `${f.slice(0, 8)}01`;
export const finMes = (f: string) => sumarDias(sumarMeses(f, 1), -1);
export const inicioAnio = (f: string) => `${f.slice(0, 4)}-01-01`;
export const finAnio = (f: string) => `${f.slice(0, 4)}-12-31`;

/** Lunes de la semana. */
export function inicioSemana(f: string): string {
  const dow = (aUTC(f).getUTCDay() + 6) % 7;
  return sumarDias(f, -dow);
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aUTC(hasta).getTime() - aUTC(desde).getTime()) / 86_400_000);
}

export type Preset = "semana" | "mes" | "mes_pasado" | "3meses" | "anio" | "personalizado";

export const PRESETS: { id: Preset; nombre: string }[] = [
  { id: "semana", nombre: "Esta semana" },
  { id: "mes", nombre: "Este mes" },
  { id: "mes_pasado", nombre: "Mes pasado" },
  { id: "3meses", nombre: "Últimos 3 meses" },
  { id: "anio", nombre: "Este año" },
  { id: "personalizado", nombre: "Personalizado" },
];

export interface Rango {
  desde: string;
  hasta: string;
}

export function rangoDePreset(p: Exclude<Preset, "personalizado">, hoy = diaLima()): Rango {
  switch (p) {
    case "semana": {
      const desde = inicioSemana(hoy);
      return { desde, hasta: sumarDias(desde, 6) };
    }
    case "mes":
      return { desde: inicioMes(hoy), hasta: finMes(hoy) };
    case "mes_pasado": {
      const desde = sumarMeses(hoy, -1);
      return { desde, hasta: finMes(desde) };
    }
    case "3meses":
      return { desde: sumarMeses(hoy, -2), hasta: finMes(hoy) };
    case "anio":
      return { desde: inicioAnio(hoy), hasta: finAnio(hoy) };
  }
}

export function granularidadPara({ desde, hasta }: Rango): Granularidad {
  const dias = diasEntre(desde, hasta) + 1;
  if (dias <= 45) return "dia";
  if (dias <= 200) return "semana";
  return "mes";
}

/** Todos los inicios de periodo del rango (para completar con ceros los vacíos). */
export function periodosDelRango({ desde, hasta }: Rango, g: Granularidad): string[] {
  const res: string[] = [];
  let f = g === "dia" ? desde : g === "semana" ? inicioSemana(desde) : inicioMes(desde);
  while (f <= hasta) {
    res.push(f);
    f = g === "dia" ? sumarDias(f, 1) : g === "semana" ? sumarDias(f, 7) : sumarMeses(f, 1);
  }
  return res;
}

export function etiquetaPeriodoCorta(f: string, g: Granularidad): string {
  if (g === "dia") return String(Number(f.slice(8)));
  if (g === "semana") return sinPunto(fmtDiaMes.format(aUTC(f)));
  return sinPunto(fmtMes.format(aUTC(f)));
}

export function etiquetaPeriodoLarga(f: string, g: Granularidad): string {
  if (g === "dia") return fmtDiaLargo.format(aUTC(f));
  if (g === "semana") return `Semana del ${sinPunto(fmtDiaMes.format(aUTC(f)))}`;
  return fmtMesAnio.format(aUTC(f));
}

/** "Hoy", "Ayer" o "sábado, 31 de octubre". */
export function etiquetaDia(f: string, hoy = diaLima()): string {
  if (f === hoy) return "Hoy";
  if (f === sumarDias(hoy, -1)) return "Ayer";
  const s = fmtDiaLargo.format(aUTC(f));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function etiquetaRango({ desde, hasta }: Rango): string {
  return `${sinPunto(fmtDiaMes.format(aUTC(desde)))} – ${sinPunto(fmtDiaMes.format(aUTC(hasta)))}`;
}

export function nombreMes(f: string): string {
  return fmtMesAnio.format(aUTC(f));
}

export const horaLima = (iso: string) => fmtHora.format(new Date(iso));
export const fechaHoraLima = (iso: string) => sinPunto(fmtFechaHora.format(new Date(iso)));

/** Valor para <input type="datetime-local"> en hora de Lima: "AAAA-MM-DDTHH:mm". */
export function aInputLocal(instante: Date | string = new Date()): string {
  const p = Object.fromEntries(
    fmtPartes.formatToParts(typeof instante === "string" ? new Date(instante) : instante).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Interpreta el valor de un <input type="datetime-local"> como hora de Lima (UTC-5, sin horario de verano). */
export function desdeInputLocal(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return null;
  const d = new Date(`${v.slice(0, 16)}:00-05:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
