import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Boton, ChipsCategoria, MensajeError, SelectorMedio, nombreCortoCategoria } from "../components/ui";
import { useCategorias } from "../hooks/estado";
import {
  actualizarGasto,
  crearGasto,
  eliminarGasto,
  obtenerGasto,
  type Categoria,
  type DatosGasto,
  type Medio,
} from "../lib/api";
import { aInputLocal, desdeInputLocal } from "../lib/fechas";
import { formatearMonto, parsearMonto } from "../lib/montos";

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^[^a-z0-9]+/, "").trim();

/** Acepta id, nombre o nombre corto ("Comidas", "comidas", "Pago de tarjeta de crédito"). */
function resolverCategoria(entrada: string | null, categorias: Categoria[]): string {
  if (!entrada) return "";
  const n = normalizar(entrada).replace(/^pago (de )?(la )?/, "");
  return (
    categorias.find((c) => [c.id, c.nombre, nombreCortoCategoria(c.nombre)].map(normalizar).includes(n))?.id ?? ""
  );
}

function resolverMedio(entrada: string | null): Medio {
  const n = normalizar(entrada ?? "");
  if (n === "yape") return "yape";
  if (n.includes("bcp")) return "bcp";
  if (n === "otro") return "otro";
  return "efectivo";
}

export default function Nuevo() {
  const { id } = useParams();
  const editando = Boolean(id);
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const { categorias } = useCategorias();

  const [monto, setMonto] = useState(params.get("monto") ?? "");
  const [categoria, setCategoria] = useState("");
  const [medio, setMedio] = useState<Medio>(resolverMedio(params.get("medio")));
  const [nota, setNota] = useState(params.get("descripcion") ?? params.get("nota") ?? "");
  const [fecha, setFecha] = useState(() => {
    const f = params.get("fecha");
    const d = f ? new Date(f) : new Date();
    return aInputLocal(Number.isNaN(d.getTime()) ? new Date() : d);
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado] = useState(!editando);
  const [categoriaOriginal, setCategoriaOriginal] = useState<string | null>(null);

  // Categoría por URL (respaldo del atajo) cuando ya se cargaron las categorías.
  useEffect(() => {
    if (!editando && !categoria && categorias.length) setCategoria(resolverCategoria(params.get("categoria"), categorias));
  }, [categorias, editando, categoria, params]);

  // Cargar el gasto a editar.
  useEffect(() => {
    if (!id) return;
    obtenerGasto(id)
      .then((g) => {
        if (!g) {
          setError("No se encontró el gasto");
          return;
        }
        setMonto(String(Number(g.monto)));
        setCategoria(g.categoria_id);
        setCategoriaOriginal(g.categoria_id);
        setMedio(g.medio as Medio);
        setNota(g.descripcion ?? "");
        setFecha(aInputLocal(g.fecha));
        setCargado(true);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const opciones = useMemo(
    () => categorias.filter((c) => c.activa || c.id === categoriaOriginal),
    [categorias, categoriaOriginal],
  );
  const montoNum = parsearMonto(monto);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (montoNum === null) return setError("Escribe un monto válido (máximo 2 decimales)");
    if (!categoria) return setError("Elige una categoría");
    const iso = desdeInputLocal(fecha);
    if (!iso) return setError("La fecha no es válida");

    const datos: DatosGasto = { monto: montoNum, categoria_id: categoria, medio, fecha: iso, descripcion: nota.trim() || null };
    setGuardando(true);
    try {
      if (id) {
        await actualizarGasto(id, datos);
        navegar(-1);
      } else {
        await crearGasto(datos, params.get("id_cliente"));
        navegar("/", { replace: true, state: { aviso: `✓ ${formatearMonto(montoNum)} guardado` } });
      }
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!id || !window.confirm("¿Eliminar este gasto? No se puede deshacer.")) return;
    setGuardando(true);
    try {
      await eliminarGasto(id);
      navegar(-1);
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-5 pt-2">
      <header className="flex items-center justify-between">
        <button type="button" onClick={() => navegar(-1)} className="min-h-11 pr-4 text-acento">
          Cancelar
        </button>
        <h1 className="text-base font-semibold">{editando ? "Editar gasto" : "Nuevo gasto"}</h1>
        <span className="w-16" />
      </header>

      {!cargado && !error ? (
        <p className="py-8 text-center text-sm text-tenue">Cargando…</p>
      ) : (
        <>
          <label className="block">
            <span className="text-sm text-tinta-2">Monto</span>
            <div className="mt-1 flex items-baseline gap-2 border-b border-linea pb-2">
              <span className="text-3xl text-tenue">S/</span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                autoFocus={!editando && !monto}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="tabular w-full bg-transparent text-5xl font-semibold outline-none"
                style={{ fontSize: "3rem" }}
                aria-label="Monto en soles"
              />
            </div>
          </label>

          <div>
            <p className="mb-2 text-sm text-tinta-2">Categoría</p>
            <ChipsCategoria categorias={opciones} valor={categoria} onCambio={setCategoria} />
          </div>

          <div>
            <p className="mb-2 text-sm text-tinta-2">Medio</p>
            <SelectorMedio valor={medio} onCambio={setMedio} />
          </div>

          <label className="block">
            <span className="text-sm text-tinta-2">Nota (opcional)</span>
            <input
              type="text"
              value={nota}
              maxLength={500}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej. menú, pasaje, recibo de luz"
              className="mt-1 min-h-12 w-full rounded-xl border border-borde bg-superficie px-3 outline-none focus:border-acento"
            />
          </label>

          <label className="block">
            <span className="text-sm text-tinta-2">Fecha y hora</span>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 min-h-12 w-full rounded-xl border border-borde bg-superficie px-3 outline-none focus:border-acento"
            />
          </label>

          {error && <MensajeError>{error}</MensajeError>}

          <Boton type="submit" disabled={guardando} className="min-h-12 w-full">
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar gasto"}
          </Boton>
          {editando && (
            <Boton type="button" variante="peligro" disabled={guardando} onClick={eliminar} className="w-full">
              Eliminar gasto
            </Boton>
          )}
        </>
      )}
    </form>
  );
}
