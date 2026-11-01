import { describe, expect, it } from "vitest";
import {
  aInputLocal,
  desdeInputLocal,
  diaLima,
  etiquetaDia,
  finMes,
  granularidadPara,
  inicioSemana,
  periodosDelRango,
  rangoDePreset,
  sumarMeses,
} from "./fechas";

describe("fechas en Lima", () => {
  it("un gasto a las 23:30 de Lima cae en ese día, no en el siguiente (UTC)", () => {
    const iso = desdeInputLocal("2026-10-31T23:30")!;
    expect(iso).toBe("2026-11-01T04:30:00.000Z");
    expect(diaLima(iso)).toBe("2026-10-31");
    expect(aInputLocal(iso)).toBe("2026-10-31T23:30");
  });

  it("la semana empieza en lunes", () => {
    expect(inicioSemana("2026-11-01")).toBe("2026-10-26"); // domingo → lunes anterior
    expect(inicioSemana("2026-10-26")).toBe("2026-10-26");
  });

  it("fin de mes y meses", () => {
    expect(finMes("2026-02-10")).toBe("2026-02-28");
    expect(finMes("2028-02-10")).toBe("2028-02-29");
    expect(sumarMeses("2026-01-31", -1)).toBe("2025-12-01");
  });

  it("presets", () => {
    const hoy = "2026-10-31";
    expect(rangoDePreset("semana", hoy)).toEqual({ desde: "2026-10-26", hasta: "2026-11-01" });
    expect(rangoDePreset("mes", hoy)).toEqual({ desde: "2026-10-01", hasta: "2026-10-31" });
    expect(rangoDePreset("mes_pasado", hoy)).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
    expect(rangoDePreset("3meses", hoy)).toEqual({ desde: "2026-08-01", hasta: "2026-10-31" });
    expect(rangoDePreset("anio", hoy)).toEqual({ desde: "2026-01-01", hasta: "2026-12-31" });
  });

  it("granularidad según el largo del rango", () => {
    expect(granularidadPara({ desde: "2026-10-01", hasta: "2026-10-31" })).toBe("dia");
    expect(granularidadPara({ desde: "2026-08-01", hasta: "2026-10-31" })).toBe("semana");
    expect(granularidadPara({ desde: "2026-01-01", hasta: "2026-12-31" })).toBe("mes");
  });

  it("periodos completos del rango", () => {
    expect(periodosDelRango({ desde: "2026-10-30", hasta: "2026-11-02" }, "dia")).toEqual([
      "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02",
    ]);
    expect(periodosDelRango({ desde: "2026-10-01", hasta: "2026-10-31" }, "semana")[0]).toBe("2026-09-28");
    expect(periodosDelRango({ desde: "2026-01-01", hasta: "2026-12-31" }, "mes")).toHaveLength(12);
  });

  it("etiquetas de día", () => {
    expect(etiquetaDia("2026-10-31", "2026-10-31")).toBe("Hoy");
    expect(etiquetaDia("2026-10-30", "2026-10-31")).toBe("Ayer");
    expect(etiquetaDia("2026-10-28", "2026-10-31")).toBe("Miércoles, 28 de octubre");
  });

  it("rechaza entradas inválidas", () => {
    expect(desdeInputLocal("")).toBeNull();
  });
});
