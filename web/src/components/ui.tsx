import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { MEDIOS, nombreMedio, type Categoria, type Gasto, type Medio } from "../lib/api";
import { horaLima } from "../lib/fechas";
import { formatearMonto } from "../lib/montos";
import { useCategorias } from "../hooks/estado";

export function Encabezado({ titulo, accion }: { titulo: string; accion?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 pb-3 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      {accion}
    </header>
  );
}

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-borde bg-superficie p-4 ${className}`}>{children}</section>;
}

export function TituloSeccion({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h2 className="text-base font-semibold">{children}</h2>
      {extra}
    </div>
  );
}

type Variante = "primario" | "secundario" | "peligro";

export function Boton({
  variante = "primario",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  const estilos: Record<Variante, string> = {
    primario: "bg-acento text-acento-tinta",
    secundario: "border border-borde bg-superficie text-tinta",
    peligro: "border border-peligro/40 bg-transparent text-peligro",
  };
  return (
    <button
      className={`min-h-11 rounded-xl px-4 font-semibold transition active:scale-[0.98] disabled:opacity-50 ${estilos[variante]} ${className}`}
      {...props}
    />
  );
}

export function Interruptor({
  activo,
  onCambio,
  etiqueta,
}: {
  activo: boolean;
  onCambio: (v: boolean) => void;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onCambio(!activo)}
      className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm text-tinta-2"
    >
      <span>{etiqueta}</span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${activo ? "bg-acento" : "bg-linea"}`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${activo ? "left-[1.375rem]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export function Selector({ etiqueta, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-tenue">
      {etiqueta}
      <select
        className="min-h-11 w-full rounded-xl border border-borde bg-superficie px-3 text-tinta outline-none focus:border-acento"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function EstadoVacio({ children = "Aún no hay gastos en este rango" }: { children?: ReactNode }) {
  return <p className="py-8 text-center text-sm text-tenue">{children}</p>;
}

export function MensajeError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-peligro/40 px-3 py-2 text-sm text-peligro">
      ⚠️ {children}
    </p>
  );
}

export function Muestra({ color }: { color: string }) {
  return <span className="inline-block h-3 w-3 shrink-0 rounded-[3px]" style={{ background: color }} aria-hidden />;
}

export function ChipsCategoria({
  categorias,
  valor,
  onCambio,
}: {
  categorias: Categoria[];
  valor: string;
  onCambio: (id: string) => void;
}) {
  const { color } = useCategorias();
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Categoría">
      {categorias.map((c) => {
        const sel = c.id === valor;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={sel}
            onClick={() => onCambio(c.id)}
            className={`flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm transition ${
              sel ? "border-acento bg-acento/10 font-semibold text-tinta" : "border-borde bg-superficie text-tinta-2"
            }`}
          >
            <span aria-hidden>{c.icono}</span>
            {nombreCortoCategoria(c.nombre)}
            {sel && <Muestra color={color(c.id)} />}
          </button>
        );
      })}
    </div>
  );
}

export function SelectorMedio({ valor, onCambio }: { valor: Medio; onCambio: (m: Medio) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-xl border border-borde bg-superficie p-1" role="radiogroup" aria-label="Medio">
      {MEDIOS.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={valor === m.id}
          onClick={() => onCambio(m.id)}
          className={`min-h-11 rounded-lg text-sm transition ${
            valor === m.id ? "bg-acento font-semibold text-acento-tinta" : "text-tinta-2"
          }`}
        >
          {m.nombre}
        </button>
      ))}
    </div>
  );
}

export function nombreCortoCategoria(nombre: string): string {
  return nombre.replace(/\s*\(.*\)\s*$/, "");
}

export function ItemGasto({ gasto, mostrarHora = true }: { gasto: Gasto; mostrarHora?: boolean }) {
  const { porId, color } = useCategorias();
  const cat = porId.get(gasto.categoria_id);
  return (
    <li>
      <Link
        to={`/gasto/${gasto.id}`}
        className="flex min-h-14 items-center gap-3 py-2 active:opacity-70"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ background: `${color(gasto.categoria_id)}26` }}
          aria-hidden
        >
          {cat?.icono ?? "•"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">
            {gasto.descripcion || (cat ? nombreCortoCategoria(cat.nombre) : gasto.categoria_id)}
          </span>
          <span className="block truncate text-xs text-tenue">
            {gasto.descripcion && cat ? `${nombreCortoCategoria(cat.nombre)} · ` : ""}
            {nombreMedio(gasto.medio)}
            {mostrarHora ? ` · ${horaLima(gasto.fecha)}` : ""}
          </span>
        </span>
        <span className="tabular shrink-0 text-[15px] font-semibold">{formatearMonto(Number(gasto.monto))}</span>
      </Link>
    </li>
  );
}

export function Cargando() {
  return <p className="py-8 text-center text-sm text-tenue">Cargando…</p>;
}
