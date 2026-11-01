import { useDeferredValue, useMemo, useState } from "react";
import { FiltroRango, valorInicial } from "../components/FiltroRango";
import { Cargando, Encabezado, EstadoVacio, ItemGasto, MensajeError, Selector, nombreCortoCategoria } from "../components/ui";
import { useCategorias, useDatos } from "../hooks/estado";
import { MEDIOS, listarGastos, type Gasto } from "../lib/api";
import { diaLima, etiquetaDia } from "../lib/fechas";
import { formatearMonto } from "../lib/montos";

export default function Movimientos() {
  const { categorias } = useCategorias();
  const [rango, setRango] = useState(valorInicial("mes"));
  const [categoria, setCategoria] = useState("");
  const [medio, setMedio] = useState("");
  const [texto, setTexto] = useState("");
  const busqueda = useDeferredValue(texto.trim());

  const { datos, error, cargando } = useDatos(
    () => listarGastos({ rango: rango.rango, categoria: categoria || null, medio: medio || null, texto: busqueda || null }),
    [rango.rango.desde, rango.rango.hasta, categoria, medio, busqueda],
  );

  // Agrupar por día de Lima con su total.
  const grupos = useMemo(() => {
    const m = new Map<string, Gasto[]>();
    for (const g of datos ?? []) {
      const d = diaLima(g.fecha);
      m.set(d, [...(m.get(d) ?? []), g]);
    }
    return [...m.entries()].map(([dia, gastos]) => ({
      dia,
      gastos,
      total: gastos.reduce((s, g) => s + Number(g.monto), 0),
    }));
  }, [datos]);
  const total = grupos.reduce((s, g) => s + g.total, 0);

  return (
    <div>
      <Encabezado titulo="Movimientos" />
      <div className="space-y-3">
        <FiltroRango valor={rango} onCambio={setRango} />
        <div className="flex gap-2">
          <Selector etiqueta="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icono} {nombreCortoCategoria(c.nombre)}
              </option>
            ))}
          </Selector>
          <Selector etiqueta="Medio" value={medio} onChange={(e) => setMedio(e.target.value)}>
            <option value="">Todos</option>
            {MEDIOS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </Selector>
        </div>
        <input
          type="search"
          placeholder="Buscar en notas"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-borde bg-superficie px-3 outline-none focus:border-acento"
        />
      </div>

      {error && <div className="mt-4"><MensajeError>{error}</MensajeError></div>}

      {datos && datos.length > 0 && (
        <p className="mt-4 text-sm text-tinta-2">
          {datos.length} gasto{datos.length === 1 ? "" : "s"} ·{" "}
          <span className="tabular font-semibold text-tinta">{formatearMonto(total)}</span>
        </p>
      )}

      {!datos ? (
        <Cargando />
      ) : datos.length === 0 ? (
        <EstadoVacio />
      ) : (
        <div className={`mt-2 space-y-4 transition-opacity ${cargando ? "opacity-50" : ""}`}>
          {grupos.map((g) => (
            <section key={g.dia}>
              <h2 className="sticky top-0 z-10 flex justify-between border-b border-linea bg-plano py-2 text-sm">
                <span className="font-semibold">{etiquetaDia(g.dia)}</span>
                <span className="tabular text-tinta-2">{formatearMonto(g.total)}</span>
              </h2>
              <ul className="divide-y divide-linea">
                {g.gastos.map((x) => (
                  <ItemGasto key={x.id} gasto={x} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
