import { describe, expect, it } from "vitest";
import {
  buscarCategoria,
  formatearSoles,
  normalizarMedio,
  parsearFecha,
  parsearMonto,
  rangoMesLima,
  tokenValido,
} from "./normalizar.ts";

const categorias = [
  { id: "comidas", nombre: "Comidas", activa: true },
  { id: "educacion", nombre: "Educación", activa: true },
  { id: "casa", nombre: "Gastos de la casa", activa: true },
  { id: "servicios", nombre: "Servicios (luz, agua, internet, celular)", activa: true },
  { id: "tarjeta", nombre: "Tarjeta de crédito", activa: true },
];

describe("parsearMonto", () => {
  it.each([
    ["12,50", 12.5],
    ["12.5", 12.5],
    ["S/ 12.50", 12.5],
    ["s/. 8", 8],
    ["PEN 3,2", 3.2],
    [12.5, 12.5],
    [7, 7],
    ["1,234.56", 1234.56],
    ["1.234,56", 1234.56],
    ["1,500", 1500],
    ["12,345", 12345],
    ["1.500", 1500],
    ["0,50", 0.5],
    ["  20  ", 20],
  ])("%s → %s", (entrada, esperado) => {
    expect(parsearMonto(entrada)).toBe(esperado);
  });

  it.each([["0"], ["-5"], ["abc"], ["0.505"], [""], ["1,2,3"], [0], [-1], [1.234], [null], [NaN]])(
    "rechaza %s",
    (entrada) => {
      expect(parsearMonto(entrada)).toBeNull();
    },
  );
});

describe("buscarCategoria", () => {
  it.each([
    ["comidas", "comidas"],
    ["Comidas", "comidas"],
    ["COMIDAS", "comidas"],
    ["educacion", "educacion"],
    ["Educación", "educacion"],
    ["Gastos de la casa", "casa"],
    ["Servicios", "servicios"],
    ["Servicios (luz, agua, internet, celular)", "servicios"],
    ["Pago de tarjeta de crédito", "tarjeta"],
    ["Tarjeta de credito", "tarjeta"],
    ["🍽️ Comidas", "comidas"],
  ])("%s → %s", (entrada, id) => {
    expect(buscarCategoria(entrada, categorias)?.id).toBe(id);
  });

  it("devuelve null si no existe", () => {
    expect(buscarCategoria("viajes", categorias)).toBeNull();
  });
});

describe("normalizarMedio", () => {
  it("acepta variantes", () => {
    expect(normalizarMedio("Yape")).toBe("yape");
    expect(normalizarMedio("BCP")).toBe("bcp");
    expect(normalizarMedio("Banca Móvil BCP")).toBe("bcp");
    expect(normalizarMedio("efectivo")).toBe("efectivo");
    expect(normalizarMedio("tarjeta")).toBeNull();
  });
});

describe("parsearFecha", () => {
  it("respeta la zona horaria", () => {
    expect(parsearFecha("2026-10-31T13:45:00-05:00")?.toISOString()).toBe("2026-10-31T18:45:00.000Z");
  });
  it("sin zona asume Lima", () => {
    expect(parsearFecha("2026-10-31T23:30:00")?.toISOString()).toBe("2026-11-01T04:30:00.000Z");
  });
  it("rechaza basura", () => {
    expect(parsearFecha("ayer")).toBeNull();
  });
});

describe("rangoMesLima", () => {
  it("un instante del 1 de noviembre UTC que en Lima aún es octubre", () => {
    const r = rangoMesLima(new Date("2026-11-01T03:00:00Z"));
    expect(r).toEqual({ desde: "2026-10-01T05:00:00.000Z", hasta: "2026-11-01T05:00:00.000Z" });
  });
  it("diciembre pasa al año siguiente", () => {
    const r = rangoMesLima(new Date("2026-12-15T12:00:00Z"));
    expect(r.hasta).toBe("2027-01-01T05:00:00.000Z");
  });
});

describe("formatearSoles", () => {
  it("formatea con miles y 2 decimales", () => {
    expect(formatearSoles(12.5)).toBe("S/ 12.50");
    expect(formatearSoles(1234567.8)).toBe("S/ 1,234,567.80");
  });
});

describe("tokenValido", () => {
  it("compara tokens", async () => {
    expect(await tokenValido("secreto", "secreto")).toBe(true);
    expect(await tokenValido("secreto2", "secreto")).toBe(false);
    expect(await tokenValido(null, "secreto")).toBe(false);
    expect(await tokenValido("x", undefined)).toBe(false);
  });
});
