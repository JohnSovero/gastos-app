import type { Database } from "./database.types";
import type { Granularidad, Rango } from "./fechas";
import { supabase } from "./supabase";

export type Categoria = Database["public"]["Tables"]["categorias"]["Row"];
export type Gasto = Database["public"]["Tables"]["gastos"]["Row"];
export type Medio = "yape" | "bcp" | "efectivo" | "otro";

export const MEDIOS: { id: Medio; nombre: string }[] = [
  { id: "yape", nombre: "Yape" },
  { id: "bcp", nombre: "BCP" },
  { id: "efectivo", nombre: "Efectivo" },
  { id: "otro", nombre: "Otro" },
];
export const nombreMedio = (m: string) => MEDIOS.find((x) => x.id === m)?.nombre ?? m;

export interface DatosGasto {
  monto: number;
  categoria_id: string;
  medio: Medio;
  fecha: string;
  descripcion: string | null;
}

/** Límites del rango (días de Lima, ambos incluidos) como instantes UTC. */
function instantes({ desde, hasta }: Rango) {
  const fin = new Date(`${hasta}T00:00:00-05:00`);
  fin.setUTCDate(fin.getUTCDate() + 1);
  return { desde: new Date(`${desde}T00:00:00-05:00`).toISOString(), hasta: fin.toISOString() };
}

function revisar<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function listarCategorias(): Promise<Categoria[]> {
  return revisar(await supabase.from("categorias").select("*").order("orden"));
}

export async function actualizarCategoria(
  id: string,
  cambios: Partial<Pick<Categoria, "nombre" | "color" | "icono" | "activa">>,
): Promise<void> {
  revisar(await supabase.from("categorias").update(cambios).eq("id", id).select("id"));
}

/**
 * UUID v4. `crypto.randomUUID` solo existe en contextos seguros (HTTPS) y en iOS 15.4+;
 * al probar en el iPhone por `http://<IP-PC>:5173` no está, así que se arma con
 * `crypto.getRandomValues`, que sí funciona en cualquier contexto.
 */
export function generarId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * `idCliente` llega en el enlace de respaldo del atajo: si ese gasto ya se registró
 * (p. ej. el atajo lo reenvió después) no se duplica.
 */
export async function crearGasto(g: DatosGasto, idCliente?: string | null): Promise<void> {
  const r = await supabase
    .from("gastos")
    .insert({ ...g, fuente: "app", id_cliente: idCliente || generarId() })
    .select("id");
  if (r.error?.code === "23505") return; // ya existía con ese id_cliente
  revisar(r);
}

export async function actualizarGasto(id: string, g: DatosGasto): Promise<void> {
  revisar(await supabase.from("gastos").update(g).eq("id", id).select("id"));
}

export async function eliminarGasto(id: string): Promise<void> {
  revisar(await supabase.from("gastos").delete().eq("id", id).select("id"));
}

export async function obtenerGasto(id: string): Promise<Gasto | null> {
  return revisar(await supabase.from("gastos").select("*").eq("id", id).maybeSingle());
}

export interface FiltrosGastos {
  rango?: Rango;
  categoria?: string | null;
  medio?: string | null;
  texto?: string | null;
  limite?: number;
}

export async function listarGastos(f: FiltrosGastos = {}): Promise<Gasto[]> {
  let q = supabase.from("gastos").select("*").order("fecha", { ascending: false }).limit(f.limite ?? 1000);
  if (f.rango) {
    const r = instantes(f.rango);
    q = q.gte("fecha", r.desde).lt("fecha", r.hasta);
  }
  if (f.categoria) q = q.eq("categoria_id", f.categoria);
  if (f.medio) q = q.eq("medio", f.medio);
  if (f.texto) q = q.ilike("descripcion", `%${f.texto.replace(/[%_]/g, "")}%`);
  return revisar(await q);
}

export type FilaCategoria = Database["public"]["Functions"]["resumen_por_categoria"]["Returns"][number];
export type FilaPeriodo = Database["public"]["Functions"]["resumen_por_periodo"]["Returns"][number];

export async function resumenPorCategoria(
  rango: Rango,
  incluirTarjeta: boolean,
  medio: string | null = null,
): Promise<FilaCategoria[]> {
  const filas = revisar(
    await supabase.rpc("resumen_por_categoria", {
      desde: rango.desde,
      hasta: rango.hasta,
      incluir_tarjeta: incluirTarjeta,
      medio,
    }),
  );
  return filas.map((f) => ({ ...f, total: Number(f.total) }));
}

export async function resumenPorPeriodo(
  rango: Rango,
  granularidad: Granularidad,
  incluirTarjeta: boolean,
  medio: string | null = null,
): Promise<FilaPeriodo[]> {
  const filas = revisar(
    await supabase.rpc("resumen_por_periodo", {
      desde: rango.desde,
      hasta: rango.hasta,
      granularidad,
      incluir_tarjeta: incluirTarjeta,
      medio,
    }),
  );
  return filas.map((f) => ({ ...f, total: Number(f.total) }));
}

export async function totalPeriodo(rango: Rango, incluirTarjeta: boolean): Promise<{ total: number; cantidad: number }> {
  const filas = revisar(
    await supabase.rpc("total_periodo", { desde: rango.desde, hasta: rango.hasta, incluir_tarjeta: incluirTarjeta }),
  );
  const f = filas[0];
  return { total: Number(f?.total ?? 0), cantidad: f?.cantidad ?? 0 };
}
