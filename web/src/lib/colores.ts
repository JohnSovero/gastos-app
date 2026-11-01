// Paleta categórica (orden fijo, validada para daltonismo entre vecinos).
// En la BD se guarda el tono para modo claro; en modo oscuro se usa su pareja.
export const PALETA: { claro: string; oscuro: string }[] = [
  { claro: "#2a78d6", oscuro: "#3987e5" }, // azul
  { claro: "#eb6834", oscuro: "#d95926" }, // naranja
  { claro: "#1baf7a", oscuro: "#199e70" }, // aguamarina
  { claro: "#eda100", oscuro: "#c98500" }, // amarillo
  { claro: "#e87ba4", oscuro: "#d55181" }, // magenta
  { claro: "#008300", oscuro: "#008300" }, // verde
  { claro: "#6250d6", oscuro: "#9085e9" }, // violeta
  { claro: "#e34948", oscuro: "#e66767" }, // rojo
];

const OSCURO = new Map(PALETA.map((p) => [p.claro.toLowerCase(), p.oscuro]));

/** Color a usar según el modo; los colores personalizados se usan tal cual. */
export function colorSegunModo(hex: string, oscuro: boolean): string {
  return oscuro ? (OSCURO.get(hex.toLowerCase()) ?? hex) : hex;
}

/** Colores de la interfaz de los gráficos (deben coincidir con index.css). */
export function tintasGrafico(oscuro: boolean) {
  return oscuro
    ? { superficie: "#1a1a19", tinta: "#f0efec", tinta2: "#c3c2b7", tenue: "#898781", rejilla: "#2c2c2a", base: "#383835" }
    : { superficie: "#fcfcfb", tinta: "#0b0b0b", tinta2: "#52514e", tenue: "#898781", rejilla: "#e1e0d9", base: "#c3c2b7" };
}
