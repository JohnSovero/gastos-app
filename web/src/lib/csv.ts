function celda(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function generarCSV(encabezados: string[], filas: (string | number | null | undefined)[][]): string {
  return [encabezados, ...filas].map((f) => f.map(celda).join(",")).join("\r\n");
}

/**
 * En el iPhone, una descarga dentro de una PWA instalada abre una vista sin botón
 * para volver; por eso se usa la hoja de compartir (Guardar en Archivos, AirDrop…)
 * y solo si no existe se descarga el archivo.
 */
export async function compartirCSV(nombre: string, contenido: string): Promise<void> {
  const blob = new Blob(["﻿" + contenido], { type: "text/csv;charset=utf-8" });
  const archivo = new File([blob], nombre, { type: "text/csv" });
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre });
      return;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
