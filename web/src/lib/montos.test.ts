import { describe, expect, it } from "vitest";
import { formatearEje, formatearMonto, parsearMonto, variacionPct } from "./montos";

const sinEspeciales = (s: string) => s.replace(/ /g, " ");

describe("montos", () => {
  it("formatea en soles", () => {
    expect(sinEspeciales(formatearMonto(12.5))).toBe("S/ 12.50");
    expect(sinEspeciales(formatearMonto(1234.5))).toBe("S/ 1,234.50");
  });

  it.each([
    ["12,50", 12.5],
    ["12.5", 12.5],
    ["S/ 8", 8],
    [" 3,2 ", 3.2],
  ])("parsea %s", (e, n) => expect(parsearMonto(e)).toBe(n));

  it.each([["0"], ["-1"], ["1.234"], ["abc"], [""], [null]])("rechaza %s", (e) =>
    expect(parsearMonto(e)).toBeNull(),
  );

  it("variación", () => {
    expect(variacionPct(150, 100)).toBe(50);
    expect(variacionPct(50, 0)).toBeNull();
  });

  it("ejes", () => {
    expect(formatearEje(1500)).toBe("1,500");
    expect(formatearEje(25000)).toBe("25k");
  });
});
