import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Categoria, FilaCategoria, FilaPeriodo } from "../lib/api";
import { tintasGrafico } from "../lib/colores";
import {
  etiquetaPeriodoCorta,
  etiquetaPeriodoLarga,
  periodosDelRango,
  type Granularidad,
  type Rango,
} from "../lib/fechas";
import { formatearEje, formatearMonto } from "../lib/montos";
import { useCategorias, useModoOscuro } from "../hooks/estado";
import { nombreCortoCategoria } from "./ui";

interface FilaTooltip {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

function CajaTooltip({ titulo, filas, total }: { titulo: string; filas: FilaTooltip[]; total?: number }) {
  return (
    <div className="min-w-40 rounded-xl border border-borde bg-superficie px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 text-tenue">{titulo}</p>
      <ul className="space-y-1">
        {filas.map((f) => (
          <li key={String(f.dataKey ?? f.name)} className="flex items-center gap-2">
            <span className="h-0.5 w-3 shrink-0 rounded" style={{ background: f.color }} aria-hidden />
            <span className="tabular font-semibold text-tinta">{formatearMonto(Number(f.value))}</span>
            <span className="truncate text-tinta-2">{f.name}</span>
          </li>
        ))}
      </ul>
      {total !== undefined && filas.length > 1 && (
        <p className="mt-1 border-t border-linea pt-1 text-tinta-2">
          Total <span className="tabular font-semibold text-tinta">{formatearMonto(total)}</span>
        </p>
      )}
    </div>
  );
}

// ---- Barras horizontales por categoría --------------------------------------

export function BarrasCategoria({ filas, atenuado = false }: { filas: FilaCategoria[]; atenuado?: boolean }) {
  const oscuro = useModoOscuro();
  const { color } = useCategorias();
  const t = tintasGrafico(oscuro);
  const datos = filas.map((f) => ({
    ...f,
    etiqueta: `${f.icono ?? ""} ${nombreCortoCategoria(f.nombre)}`.trim(),
  }));
  const alto = datos.length * 40 + 8;

  return (
    <div
      className={`transition-opacity ${atenuado ? "opacity-50" : ""}`}
      role="img"
      aria-label={`Gasto por categoría: ${datos.map((d) => `${d.etiqueta} ${formatearMonto(d.total)}`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height={alto}>
        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 84, bottom: 4, left: 0 }} barCategoryGap={10}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="etiqueta"
            width={128}
            tickLine={false}
            axisLine={{ stroke: t.base }}
            tick={{ fill: t.tinta2, fontSize: 13 }}
          />
          <Tooltip
            cursor={{ fill: t.rejilla, opacity: 0.6 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <CajaTooltip
                  titulo={`${payload[0].payload.cantidad} gasto${payload[0].payload.cantidad === 1 ? "" : "s"}`}
                  filas={[{ dataKey: "total", value: payload[0].payload.total, name: payload[0].payload.etiqueta, color: color(payload[0].payload.categoria_id) }]}
                />
              ) : null
            }
          />
          <Bar dataKey="total" barSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {datos.map((d) => (
              <Cell key={d.categoria_id} fill={color(d.categoria_id)} />
            ))}
            <LabelList
              dataKey="total"
              position="right"
              formatter={(v: unknown) => formatearMonto(Number(v))}
              style={{ fill: t.tinta, fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Barras por fecha apiladas por categoría -------------------------------

export function BarrasPeriodo({
  filas,
  rango,
  granularidad,
  ocultas,
  onAlternar,
  atenuado = false,
}: {
  filas: FilaPeriodo[];
  rango: Rango;
  granularidad: Granularidad;
  ocultas: Set<string>;
  onAlternar: (id: string) => void;
  atenuado?: boolean;
}) {
  const oscuro = useModoOscuro();
  const { categorias, color } = useCategorias();
  const t = tintasGrafico(oscuro);

  // Categorías con datos en el rango, en el orden fijo (el color sigue a la categoría).
  const conDatos: Categoria[] = useMemo(() => {
    const ids = new Set(filas.map((f) => f.categoria_id));
    return categorias.filter((c) => ids.has(c.id));
  }, [filas, categorias]);
  const visibles = conDatos.filter((c) => !ocultas.has(c.id));

  const datos = useMemo(() => {
    const porPeriodo = new Map<string, Record<string, number>>();
    for (const f of filas) {
      const fila = porPeriodo.get(f.periodo) ?? {};
      fila[f.categoria_id] = (fila[f.categoria_id] ?? 0) + f.total;
      porPeriodo.set(f.periodo, fila);
    }
    return periodosDelRango(rango, granularidad).map((p) => {
      const valores = porPeriodo.get(p) ?? {};
      const tope = [...visibles].reverse().find((c) => (valores[c.id] ?? 0) > 0)?.id ?? null;
      const total = visibles.reduce((s, c) => s + (valores[c.id] ?? 0), 0);
      return { periodo: p, etiqueta: etiquetaPeriodoCorta(p, granularidad), tope, total, ...valores };
    });
  }, [filas, rango, granularidad, visibles]);

  return (
    <div>
      {/* Leyenda: siempre presente; tocar una categoría la oculta o la muestra */}
      <ul className="mb-3 flex flex-wrap gap-x-1 gap-y-1" aria-label="Categorías del gráfico">
        {conDatos.map((c) => {
          const activa = !ocultas.has(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                aria-pressed={activa}
                onClick={() => onAlternar(c.id)}
                className={`flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs transition ${
                  activa ? "text-tinta-2" : "text-tenue line-through opacity-60"
                }`}
              >
                <span
                  className="inline-block h-3 w-3 rounded-[3px]"
                  style={{ background: activa ? color(c.id) : "transparent", border: `1.5px solid ${color(c.id)}` }}
                  aria-hidden
                />
                {nombreCortoCategoria(c.nombre)}
              </button>
            </li>
          );
        })}
      </ul>

      <div className={`transition-opacity ${atenuado ? "opacity-50" : ""}`}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={datos} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={t.rejilla} strokeWidth={1} />
            <XAxis
              dataKey="etiqueta"
              tickLine={false}
              axisLine={{ stroke: t.base }}
              tick={{ fill: t.tenue, fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tick={{ fill: t.tenue, fontSize: 11 }}
              tickFormatter={(v: number) => formatearEje(v)}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: t.rejilla, opacity: 0.6 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const fila = payload[0].payload as { periodo: string; total: number };
                const items = [...(payload as unknown as readonly FilaTooltip[])]
                  .filter((p) => Number(p.value) > 0)
                  .reverse();
                return (
                  <CajaTooltip
                    titulo={etiquetaPeriodoLarga(fila.periodo, granularidad)}
                    filas={items.length ? items : [{ name: "Sin gastos", value: 0, color: t.tenue, dataKey: "x" }]}
                    total={fila.total}
                  />
                );
              }}
            />
            {visibles.map((c) => (
              <Bar
                key={c.id}
                dataKey={c.id}
                name={nombreCortoCategoria(c.nombre)}
                stackId="total"
                fill={color(c.id)}
                stroke={t.superficie}
                strokeWidth={2}
                maxBarSize={24}
                isAnimationActive={false}
                shape={(props: unknown) => {
                  const p = props as { payload: { tope: string | null } } & Record<string, unknown>;
                  return <Rectangle {...p} radius={p.payload.tope === c.id ? [4, 4, 0, 0] : 0} />;
                }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
