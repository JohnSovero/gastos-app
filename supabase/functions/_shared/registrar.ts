// Lógica de la Edge Function "registrar-gasto", separada de Deno y de Supabase
// para poder probarla con vitest inyectando un repositorio falso.
import { z } from "zod";
import {
  buscarCategoria,
  type Categoria,
  ETIQUETA_MEDIO,
  formatearSoles,
  type Medio,
  nombreCorto,
  normalizarMedio,
  parsearFecha,
  parsearMonto,
  rangoMesLima,
  tokenValido,
} from "./normalizar.ts";

export interface NuevoGasto {
  monto: number;
  categoria_id: string;
  medio: Medio;
  fecha: string;
  descripcion: string | null;
  id_cliente: string | null;
  fuente: "atajo";
}

export interface GastoGuardado extends NuevoGasto {
  id: string;
}

export interface Repo {
  categorias(): Promise<Categoria[]>;
  /** Inserta; si ya existe un gasto con el mismo id_cliente devuelve ese con duplicado = true. */
  insertar(g: NuevoGasto): Promise<{ gasto: GastoGuardado; duplicado: boolean }>;
  /** Suma de montos con fecha en [desde, hasta). */
  totalEntre(desde: string, hasta: string): Promise<number>;
}

export interface Dependencias {
  token: string | undefined;
  repo: Repo;
  ahora?: () => Date;
}

const vacioAIndefinido = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const esquemaGasto = z.object(
  {
    monto: z.preprocess(
      vacioAIndefinido,
      z.union([z.string(), z.number()], {
        required_error: "Falta el monto",
        invalid_type_error: "El monto no es válido",
      }),
    ),
    categoria: z.preprocess(
      vacioAIndefinido,
      z.string({ required_error: "Falta la categoría", invalid_type_error: "La categoría no es válida" }),
    ),
    medio: z.preprocess(
      vacioAIndefinido,
      z.string({ required_error: "Falta el medio de pago", invalid_type_error: "El medio de pago no es válido" }),
    ),
    fecha: z.preprocess(vacioAIndefinido, z.string({ invalid_type_error: "La fecha no es válida" }).optional()),
    descripcion: z.preprocess(
      vacioAIndefinido,
      z.string({ invalid_type_error: "La nota no es válida" })
        .max(500, "La nota es muy larga (máximo 500 caracteres)")
        .optional(),
    ),
    id_cliente: z.preprocess(
      (v) => (typeof v === "number" ? String(v) : vacioAIndefinido(v)),
      z.string({ invalid_type_error: "El id_cliente no es válido" })
        .max(100, "El id_cliente es muy largo")
        .optional(),
    ),
  },
  { invalid_type_error: "Cada gasto debe ser un objeto JSON" },
);

type Resultado =
  | { ok: true; gasto: GastoGuardado; duplicado: boolean; categoria: string }
  | { ok: false; error: string };

function json(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * Acepta un objeto JSON, un arreglo, `{ "gastos": [...] }` o NDJSON (un gasto por
 * línea). El atajo envía su archivo de gastos pendientes: objetos JSON uno tras
 * otro, que pueden venir con saltos de línea dentro, así que se separan por llaves.
 */
export function leerCuerpo(texto: string): unknown[] | null {
  const t = texto.replace(/^﻿/, "").trim();
  if (!t) return null;
  try {
    const v = JSON.parse(t);
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object" && Array.isArray((v as { gastos?: unknown }).gastos)) {
      return (v as { gastos: unknown[] }).gastos;
    }
    return [v];
  } catch {
    const objetos = separarObjetos(t);
    if (!objetos || objetos.length < 2) return null;
    try {
      return objetos.map((o) => JSON.parse(o));
    } catch {
      return null;
    }
  }
}

/** Divide "{…}\n{…}{…}" en objetos de primer nivel, respetando llaves dentro de cadenas. */
function separarObjetos(t: string): string[] | null {
  const res: string[] = [];
  let profundidad = 0;
  let inicio = -1;
  let enCadena = false;
  let escape = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (enCadena) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') enCadena = false;
      continue;
    }
    if (ch === '"') enCadena = true;
    else if (ch === "{") {
      if (profundidad++ === 0) inicio = i;
    } else if (ch === "}") {
      if (--profundidad < 0) return null;
      if (profundidad === 0) res.push(t.slice(inicio, i + 1));
    } else if (profundidad === 0 && !/\s/.test(ch)) {
      return null; // texto suelto fuera de un objeto
    }
  }
  return profundidad === 0 ? res : null;
}

async function procesarUno(
  entrada: unknown,
  categorias: Categoria[],
  repo: Repo,
  ahora: Date,
): Promise<Resultado> {
  const r = esquemaGasto.safeParse(entrada);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Datos inválidos" };
  const d = r.data;

  const monto = parsearMonto(d.monto);
  if (monto === null) return { ok: false, error: "El monto no es válido" };

  const cat = buscarCategoria(d.categoria, categorias);
  if (!cat) return { ok: false, error: `No existe la categoría "${d.categoria}"` };
  if (!cat.activa) return { ok: false, error: `La categoría "${nombreCorto(cat.nombre)}" está desactivada` };

  const medio = normalizarMedio(d.medio);
  if (!medio) return { ok: false, error: "El medio debe ser yape, bcp, efectivo u otro" };

  let fecha = ahora;
  if (d.fecha !== undefined) {
    const f = parsearFecha(d.fecha);
    if (!f) return { ok: false, error: "La fecha no es válida" };
    if (f.getTime() > ahora.getTime() + 24 * 3600 * 1000) {
      return { ok: false, error: "La fecha está en el futuro" };
    }
    fecha = f;
  }

  const { gasto, duplicado } = await repo.insertar({
    monto,
    categoria_id: cat.id,
    medio,
    fecha: fecha.toISOString(),
    descripcion: d.descripcion?.trim() || null,
    id_cliente: d.id_cliente?.trim() || null,
    fuente: "atajo",
  });
  return { ok: true, gasto, duplicado, categoria: nombreCorto(cat.nombre) };
}

export async function manejar(req: Request, deps: Dependencias): Promise<Response> {
  if (req.method !== "POST") return json({ ok: false, error: "Usa el método POST" }, 405);

  if (!(await tokenValido(req.headers.get("x-api-key"), deps.token))) {
    return json({ ok: false, error: "No autorizado: revisa la clave x-api-key del atajo" }, 401);
  }

  const items = leerCuerpo(await req.text());
  if (!items || items.length === 0) {
    return json({ ok: false, error: "El cuerpo no es un JSON válido" }, 400);
  }
  if (items.length > 200) {
    return json({ ok: false, error: "Demasiados gastos en un solo envío (máximo 200)" }, 400);
  }

  const ahora = deps.ahora?.() ?? new Date();
  try {
    const categorias = await deps.repo.categorias();
    const resultados: Resultado[] = [];
    for (const item of items) {
      resultados.push(await procesarUno(item, categorias, deps.repo, ahora));
    }

    const exitos = resultados.filter((r): r is Extract<Resultado, { ok: true }> => r.ok);
    const errores = resultados
      .map((r, i) => (r.ok ? null : { indice: i, error: r.error }))
      .filter((e): e is { indice: number; error: string } => e !== null);

    if (exitos.length === 0) {
      const error = errores.length === 1
        ? errores[0].error
        : `Ningún gasto se registró. Primer error: ${errores[0].error}`;
      return json({ ok: false, error, errores }, 400);
    }

    const ultimo = exitos[exitos.length - 1];
    const mes = rangoMesLima(ahora);
    const totalMes = Math.round((await deps.repo.totalEntre(mes.desde, mes.hasta)) * 100) / 100;

    let mensaje = `✓ ${formatearSoles(ultimo.gasto.monto)} · ${ultimo.categoria} · ${ETIQUETA_MEDIO[ultimo.gasto.medio]}`;
    if (ultimo.duplicado && exitos.length === 1) mensaje += " (ya estaba registrado)";
    const nuevosPrevios = exitos.slice(0, -1).filter((r) => !r.duplicado).length;
    if (nuevosPrevios > 0) {
      mensaje += ` · +${nuevosPrevios} pendiente${nuevosPrevios === 1 ? "" : "s"} enviado${nuevosPrevios === 1 ? "" : "s"}`;
    }
    if (errores.length > 0) {
      mensaje += ` · ⚠️ ${errores.length} descartado${errores.length === 1 ? "" : "s"}: ${errores[0].error}`;
    }

    return json({
      ok: true,
      mensaje,
      gasto: ultimo.gasto,
      duplicado: ultimo.duplicado,
      registrados: exitos.filter((r) => !r.duplicado).length,
      duplicados: exitos.filter((r) => r.duplicado).length,
      errores,
      total_mes: totalMes,
      total_mes_texto: formatearSoles(totalMes),
    });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "Error del servidor al guardar el gasto. Inténtalo de nuevo." }, 500);
  }
}
