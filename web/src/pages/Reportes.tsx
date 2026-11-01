import { useState } from "react";
import { FiltroRango, valorInicial } from "../components/FiltroRango";
import { BarrasCategoria, BarrasPeriodo } from "../components/graficos";
import {
  Boton,
  Cargando,
  Encabezado,
  EstadoVacio,
  Interruptor,
  MensajeError,
  Muestra,
  Selector,
  Tarjeta,
  TituloSeccion,
  nombreCortoCategoria,
} from "../components/ui";
import { useCategorias, useDatos, useIncluirTarjeta } from "../hooks/estado";
import { MEDIOS, listarGastos, nombreMedio, resumenPorCategoria, resumenPorPeriodo } from "../lib/api";
import { compartirCSV, generarCSV } from "../lib/csv";
import { aInputLocal, etiquetaRango, granularidadPara } from "../lib/fechas";
import { formatearMonto, formatearPct } from "../lib/montos";

const NOMBRE_GRANULARIDAD = { dia: "por día", semana: "por semana", mes: "por mes" } as const;

export default function Reportes() {
  const { porId, color } = useCategorias();
  const [rango, setRango] = useState(valorInicial("mes"));
  const [medio, setMedio] = useState("");
  const [incluirTarjeta, setIncluirTarjeta] = useIncluirTarjeta();
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const [exportando, setExportando] = useState(false);
  const [errorCsv, setErrorCsv] = useState<string | null>(null);
  const granularidad = granularidadPara(rango.rango);

  const { datos, error, cargando } = useDatos(async () => {
    const [porCategoria, porPeriodo] = await Promise.all([
      resumenPorCategoria(rango.rango, incluirTarjeta, medio || null),
      resumenPorPeriodo(rango.rango, granularidad, incluirTarjeta, medio || null),
    ]);
    return { porCategoria, porPeriodo };
  }, [rango.rango.desde, rango.rango.hasta, granularidad, incluirTarjeta, medio]);

  const total = datos?.porCategoria.reduce((s, f) => s + f.total, 0) ?? 0;
  const cantidad = datos?.porCategoria.reduce((s, f) => s + f.cantidad, 0) ?? 0;

  function alternar(id: string) {
    setOcultas((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  async function exportar() {
    setExportando(true);
    setErrorCsv(null);
    try {
      const gastos = (await listarGastos({ rango: rango.rango, medio: medio || null, limite: 10000 })).filter(
        (g) => incluirTarjeta || !porId.get(g.categoria_id)?.es_pago_deuda,
      );
      const csv = generarCSV(
        ["fecha", "hora", "categoria", "medio", "monto", "nota"],
        [...gastos].reverse().map((g) => {
          const [dia, hora] = aInputLocal(g.fecha).split("T");
          return [
            dia,
            hora,
            nombreCortoCategoria(porId.get(g.categoria_id)?.nombre ?? g.categoria_id),
            nombreMedio(g.medio),
            Number(g.monto).toFixed(2),
            g.descripcion,
          ];
        }),
      );
      await compartirCSV(`gastos_${rango.rango.desde}_${rango.rango.hasta}.csv`, csv);
    } catch (e) {
      setErrorCsv((e as Error).message);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <Encabezado titulo="Reportes" />

      {/* Filtros: una sola fila de controles que afecta a todo lo de abajo */}
      <div className="space-y-2">
        <FiltroRango valor={rango} onCambio={setRango} />
        <div className="flex items-end gap-3">
          <Selector etiqueta="Medio" value={medio} onChange={(e) => setMedio(e.target.value)}>
            <option value="">Todos</option>
            {MEDIOS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </Selector>
          <div className="flex-[1.4]">
            <Interruptor etiqueta="Incluir pagos de tarjeta" activo={incluirTarjeta} onCambio={setIncluirTarjeta} />
          </div>
        </div>
      </div>

      {error && <div className="mt-4"><MensajeError>{error}</MensajeError></div>}

      {!datos ? (
        <Cargando />
      ) : (
        <div className="mt-4 space-y-4">
          <Tarjeta>
            <p className="text-sm text-tinta-2">{etiquetaRango(rango.rango)}</p>
            <p className={`mt-1 text-5xl font-semibold tracking-tight transition-opacity ${cargando ? "opacity-50" : ""}`}>
              {formatearMonto(total)}
            </p>
            <p className="mt-2 text-sm text-tinta-2">
              {cantidad} gasto{cantidad === 1 ? "" : "s"}
            </p>
          </Tarjeta>

          {datos.porCategoria.length === 0 ? (
            <Tarjeta>
              <EstadoVacio />
            </Tarjeta>
          ) : (
            <>
              <Tarjeta>
                <TituloSeccion>Por categoría</TituloSeccion>
                <BarrasCategoria filas={datos.porCategoria} atenuado={cargando} />
              </Tarjeta>

              <Tarjeta>
                <TituloSeccion>Por fecha · {NOMBRE_GRANULARIDAD[granularidad]}</TituloSeccion>
                <BarrasPeriodo
                  filas={datos.porPeriodo}
                  rango={rango.rango}
                  granularidad={granularidad}
                  ocultas={ocultas}
                  onAlternar={alternar}
                  atenuado={cargando}
                />
              </Tarjeta>

              <Tarjeta>
                <TituloSeccion>Detalle</TituloSeccion>
                <table className="tabular w-full text-sm">
                  <thead>
                    <tr className="border-b border-linea text-left text-xs text-tenue">
                      <th className="py-2 font-normal">Categoría</th>
                      <th className="py-2 text-right font-normal">Total</th>
                      <th className="py-2 text-right font-normal">%</th>
                      <th className="py-2 text-right font-normal">Nº</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linea">
                    {datos.porCategoria.map((f) => (
                      <tr key={f.categoria_id}>
                        <td className="py-2">
                          <span className="flex items-center gap-2">
                            <Muestra color={color(f.categoria_id)} />
                            {nombreCortoCategoria(f.nombre)}
                          </span>
                        </td>
                        <td className="py-2 text-right font-medium">{formatearMonto(f.total)}</td>
                        <td className="py-2 text-right text-tinta-2">
                          {formatearPct(total ? (f.total / total) * 100 : 0)}
                        </td>
                        <td className="py-2 text-right text-tinta-2">{f.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-linea font-semibold">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-right">{formatearMonto(total)}</td>
                      <td className="py-2 text-right">100%</td>
                      <td className="py-2 text-right">{cantidad}</td>
                    </tr>
                  </tfoot>
                </table>
                {errorCsv && <div className="mt-3"><MensajeError>{errorCsv}</MensajeError></div>}
                <Boton variante="secundario" className="mt-4 w-full" onClick={exportar} disabled={exportando}>
                  {exportando ? "Preparando…" : "Exportar CSV"}
                </Boton>
              </Tarjeta>
            </>
          )}
        </div>
      )}
    </div>
  );
}
