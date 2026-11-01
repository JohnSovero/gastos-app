import { Link } from "react-router-dom";
import { BarrasCategoria } from "../components/graficos";
import { Cargando, EstadoVacio, Interruptor, ItemGasto, MensajeError, Tarjeta, TituloSeccion } from "../components/ui";
import { useDatos, useIncluirTarjeta } from "../hooks/estado";
import { listarGastos, resumenPorCategoria, totalPeriodo } from "../lib/api";
import { diaLima, finMes, inicioMes, nombreMes, sumarDias, sumarMeses } from "../lib/fechas";
import { formatearMonto, variacionPct } from "../lib/montos";

export default function Inicio() {
  const [incluirTarjeta, setIncluirTarjeta] = useIncluirTarjeta();
  const hoy = diaLima();
  const mes = { desde: inicioMes(hoy), hasta: finMes(hoy) };
  // Mismo tramo del mes pasado (del 1 al mismo día) para que la comparación sea justa.
  const desdeAnterior = sumarMeses(hoy, -1);
  const hastaAnterior = [sumarDias(desdeAnterior, Number(hoy.slice(8)) - 1), finMes(desdeAnterior)].sort()[0];
  const tramoActual = { desde: mes.desde, hasta: hoy };
  const tramoAnterior = { desde: desdeAnterior, hasta: hastaAnterior };

  const resumen = useDatos(async () => {
    const [total, actual, anterior, categorias] = await Promise.all([
      totalPeriodo(mes, incluirTarjeta),
      totalPeriodo(tramoActual, incluirTarjeta),
      totalPeriodo(tramoAnterior, incluirTarjeta),
      resumenPorCategoria(mes, incluirTarjeta),
    ]);
    return { total, variacion: variacionPct(actual.total, anterior.total), categorias };
  }, [incluirTarjeta, hoy]);

  const ultimos = useDatos(() => listarGastos({ limite: 5 }), []);
  const d = resumen.datos;

  return (
    <div className="space-y-4 pt-4">
      <Tarjeta>
        <p className="text-sm text-tinta-2">
          Total de {nombreMes(hoy)}
        </p>
        {d ? (
          <>
            <p className={`mt-1 text-5xl font-semibold tracking-tight transition-opacity ${resumen.cargando ? "opacity-50" : ""}`}>
              {formatearMonto(d.total.total)}
            </p>
            <p className="mt-2 text-sm text-tinta-2">
              {d.total.cantidad} gasto{d.total.cantidad === 1 ? "" : "s"}
              {d.variacion !== null && (
                <>
                  {" · "}
                  <span className={d.variacion > 0 ? "text-peligro" : "text-exito"}>
                    {d.variacion > 0 ? "▲" : "▼"} {Math.abs(d.variacion).toFixed(0)}%
                  </span>{" "}
                  vs. mismo tramo del mes pasado
                </>
              )}
            </p>
          </>
        ) : resumen.error ? (
          <MensajeError>{resumen.error}</MensajeError>
        ) : (
          <p className="mt-1 text-5xl font-semibold text-tenue">—</p>
        )}
        <div className="mt-3 border-t border-linea pt-1">
          <Interruptor etiqueta="Incluir pagos de tarjeta" activo={incluirTarjeta} onCambio={setIncluirTarjeta} />
        </div>
      </Tarjeta>

      <Tarjeta>
        <TituloSeccion extra={<Link to="/reportes" className="text-sm text-acento">Ver reportes</Link>}>
          Por categoría
        </TituloSeccion>
        {!d ? (
          <Cargando />
        ) : d.categorias.length === 0 ? (
          <EstadoVacio>Aún no hay gastos este mes</EstadoVacio>
        ) : (
          <BarrasCategoria filas={d.categorias} atenuado={resumen.cargando} />
        )}
      </Tarjeta>

      <Tarjeta>
        <TituloSeccion extra={<Link to="/movimientos" className="text-sm text-acento">Ver todos</Link>}>
          Últimos gastos
        </TituloSeccion>
        {ultimos.error && <MensajeError>{ultimos.error}</MensajeError>}
        {!ultimos.datos ? (
          <Cargando />
        ) : ultimos.datos.length === 0 ? (
          <EstadoVacio>Aún no registras gastos. Toca + para el primero.</EstadoVacio>
        ) : (
          <ul className="divide-y divide-linea">
            {ultimos.datos.map((g) => (
              <ItemGasto key={g.id} gasto={g} />
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
