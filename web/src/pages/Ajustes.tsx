import { useState } from "react";
import { Boton, Encabezado, Interruptor, MensajeError, Tarjeta, TituloSeccion } from "../components/ui";
import { useCategorias, useSesion } from "../hooks/estado";
import { actualizarCategoria, type Categoria } from "../lib/api";
import { PALETA } from "../lib/colores";
import { URL_EDGE_FUNCTION, supabase } from "../lib/supabase";

function FilaCategoria({ c, onGuardado }: { c: Categoria; onGuardado: () => Promise<void> }) {
  const { color: colorDe } = useCategorias();
  const [nombre, setNombre] = useState(c.nombre);
  const [icono, setIcono] = useState(c.icono ?? "");
  const [color, setColor] = useState(c.color);
  const [abierta, setAbierta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cambiado = nombre !== c.nombre || icono !== (c.icono ?? "") || color !== c.color;

  async function guardar(cambios: Parameters<typeof actualizarCategoria>[1]) {
    setGuardando(true);
    setError(null);
    try {
      await actualizarCategoria(c.id, cambios);
      await onGuardado();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <li className="py-2">
      <button
        type="button"
        onClick={() => setAbierta(!abierta)}
        aria-expanded={abierta}
        className={`flex min-h-11 w-full items-center gap-3 text-left ${c.activa ? "" : "opacity-50"}`}
      >
        <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: colorDe(c.id) }} aria-hidden />
        <span aria-hidden>{c.icono}</span>
        <span className="flex-1 truncate">{c.nombre}</span>
        {!c.activa && <span className="text-xs text-tenue">Desactivada</span>}
        {c.es_pago_deuda && <span className="text-xs text-tenue">Pago de deuda</span>}
        <span className="text-tenue" aria-hidden>{abierta ? "▴" : "▾"}</span>
      </button>

      {abierta && (
        <div className="mt-2 space-y-3 rounded-xl bg-plano p-3">
          <div className="flex gap-2">
            <label className="flex w-16 flex-col gap-1 text-xs text-tenue">
              Ícono
              <input
                value={icono}
                maxLength={4}
                onChange={(e) => setIcono(e.target.value)}
                className="min-h-11 rounded-lg border border-borde bg-superficie text-center text-tinta outline-none"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-tenue">
              Nombre
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="min-h-11 rounded-lg border border-borde bg-superficie px-3 text-tinta outline-none"
              />
            </label>
          </div>
          <div>
            <p className="mb-1 text-xs text-tenue">Color</p>
            <div className="flex flex-wrap items-center gap-2">
              {PALETA.map((p) => (
                <button
                  key={p.claro}
                  type="button"
                  aria-label={`Color ${p.claro}`}
                  aria-pressed={color.toLowerCase() === p.claro}
                  onClick={() => setColor(p.claro)}
                  className={`h-9 w-9 rounded-full border-2 ${color.toLowerCase() === p.claro ? "border-tinta" : "border-transparent"}`}
                  style={{ background: p.claro }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Otro color"
                className="h-9 w-11 rounded border border-borde bg-transparent"
              />
            </div>
          </div>
          <Interruptor
            etiqueta="Activa (aparece al registrar)"
            activo={c.activa}
            onCambio={(v) => guardar({ activa: v })}
          />
          {error && <MensajeError>{error}</MensajeError>}
          <Boton
            disabled={!cambiado || guardando || !nombre.trim()}
            onClick={() => guardar({ nombre: nombre.trim(), icono: icono.trim() || null, color })}
            className="w-full"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </Boton>
        </div>
      )}
    </li>
  );
}

export default function Ajustes() {
  const { categorias, recargar } = useCategorias();
  const { sesion } = useSesion();
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(URL_EDGE_FUNCTION);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Encabezado titulo="Ajustes" />

      <Tarjeta>
        <TituloSeccion>Categorías</TituloSeccion>
        <ul className="divide-y divide-linea">
          {categorias.map((c) => (
            <FilaCategoria key={`${c.id}-${c.nombre}-${c.color}-${c.icono}`} c={c} onGuardado={recargar} />
          ))}
        </ul>
        <p className="mt-2 text-xs text-tenue">
          El atajo envía el id de la categoría, así que renombrarla no lo afecta. Si desactivas una, quítala también del menú del atajo.
        </p>
      </Tarjeta>

      <Tarjeta>
        <TituloSeccion>Atajo de iOS</TituloSeccion>
        <p className="text-sm text-tinta-2">URL para la acción «Obtener contenido de URL»:</p>
        <code className="mt-2 block break-all rounded-lg bg-plano p-3 text-xs">{URL_EDGE_FUNCTION}</code>
        <Boton variante="secundario" className="mt-3 w-full" onClick={copiar}>
          {copiado ? "✓ Copiada" : "Copiar URL"}
        </Boton>
        <p className="mt-3 text-xs text-tenue">
          El token <code>x-api-key</code> no se muestra aquí por seguridad: está en tu gestor de contraseñas y en
          los secretos de Supabase (<code>INGEST_TOKEN</code>). Guía completa en <code>docs/atajo-ios.md</code>.
        </p>
      </Tarjeta>

      <Tarjeta>
        <TituloSeccion>Cuenta</TituloSeccion>
        <p className="mb-3 truncate text-sm text-tinta-2">{sesion?.user.email}</p>
        <Boton variante="peligro" className="w-full" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </Boton>
      </Tarjeta>
    </div>
  );
}
