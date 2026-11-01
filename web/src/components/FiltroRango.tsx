import { PRESETS, rangoDePreset, type Preset, type Rango } from "../lib/fechas";

export interface ValorRango {
  preset: Preset;
  rango: Rango;
}

export function valorInicial(preset: Exclude<Preset, "personalizado"> = "mes"): ValorRango {
  return { preset, rango: rangoDePreset(preset) };
}

/** Presets en una fila desplazable; el rango personalizado aparece debajo. */
export function FiltroRango({
  valor,
  onCambio,
  sinSemana = false,
}: {
  valor: ValorRango;
  onCambio: (v: ValorRango) => void;
  sinSemana?: boolean;
}) {
  const presets = PRESETS.filter((p) => !(sinSemana && p.id === "semana"));
  return (
    <div className="space-y-2">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="radiogroup" aria-label="Rango">
        {presets.map((p) => {
          const sel = valor.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={sel}
              onClick={() =>
                onCambio({ preset: p.id, rango: p.id === "personalizado" ? valor.rango : rangoDePreset(p.id) })
              }
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm transition ${
                sel ? "border-acento bg-acento font-semibold text-acento-tinta" : "border-borde bg-superficie text-tinta-2"
              }`}
            >
              {p.nombre}
            </button>
          );
        })}
      </div>
      {valor.preset === "personalizado" && (
        <div className="flex gap-2">
          {(["desde", "hasta"] as const).map((k) => (
            <label key={k} className="flex flex-1 flex-col gap-1 text-xs text-tenue">
              {k === "desde" ? "Desde" : "Hasta"}
              <input
                type="date"
                value={valor.rango[k]}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const r = { ...valor.rango, [k]: e.target.value };
                  if (r.desde > r.hasta) {
                    if (k === "desde") r.hasta = r.desde;
                    else r.desde = r.hasta;
                  }
                  onCambio({ preset: "personalizado", rango: r });
                }}
                className="min-h-11 w-full rounded-xl border border-borde bg-superficie px-3 text-tinta outline-none focus:border-acento"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
