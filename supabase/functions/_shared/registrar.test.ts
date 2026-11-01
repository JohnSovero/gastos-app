import { beforeEach, describe, expect, it } from "vitest";
import { leerCuerpo, manejar, type GastoGuardado, type Repo } from "./registrar.ts";

const TOKEN = "token-de-prueba";
const AHORA = new Date("2026-10-31T18:45:00Z"); // 13:45 en Lima

function repoEnMemoria() {
  const gastos: GastoGuardado[] = [];
  const repo: Repo = {
    async categorias() {
      return [
        { id: "comidas", nombre: "Comidas", activa: true },
        { id: "tarjeta", nombre: "Tarjeta de crédito", activa: true },
        { id: "bebidas", nombre: "Bebidas", activa: false },
      ];
    },
    async insertar(g) {
      const existente = g.id_cliente ? gastos.find((x) => x.id_cliente === g.id_cliente) : undefined;
      if (existente) return { gasto: existente, duplicado: true };
      const nuevo = { ...g, id: `id-${gastos.length + 1}` };
      gastos.push(nuevo);
      return { gasto: nuevo, duplicado: false };
    },
    async totalEntre(desde, hasta) {
      return gastos.filter((g) => g.fecha >= desde && g.fecha < hasta).reduce((s, g) => s + g.monto, 0);
    },
  };
  return { repo, gastos };
}

function pedir(cuerpo: unknown, token: string | null = TOKEN) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers["x-api-key"] = token;
  return new Request("http://localhost/registrar-gasto", {
    method: "POST",
    headers,
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
}

describe("registrar-gasto", () => {
  let db: ReturnType<typeof repoEnMemoria>;
  const enviar = async (cuerpo: unknown, token?: string | null) => {
    const res = await manejar(pedir(cuerpo, token === undefined ? TOKEN : token), {
      token: TOKEN,
      repo: db.repo,
      ahora: () => AHORA,
    });
    return { status: res.status, body: await res.json() };
  };

  beforeEach(() => {
    db = repoEnMemoria();
  });

  it("sin token → 401", async () => {
    const r = await enviar({ monto: 5, categoria: "comidas", medio: "yape" }, null);
    expect(r.status).toBe(401);
    expect(r.body.ok).toBe(false);
  });

  it("token inválido → 401", async () => {
    const r = await enviar({ monto: 5, categoria: "comidas", medio: "yape" }, "otro");
    expect(r.status).toBe(401);
  });

  it("registra un gasto Yape normalizando monto y categoría", async () => {
    const r = await enviar({ monto: "12,50", categoria: "comidas", medio: "yape", descripcion: "menú" });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      ok: true,
      mensaje: "✓ S/ 12.50 · Comidas · Yape",
      total_mes: 12.5,
      total_mes_texto: "S/ 12.50",
    });
    expect(db.gastos[0]).toMatchObject({
      monto: 12.5,
      categoria_id: "comidas",
      medio: "yape",
      fuente: "atajo",
      descripcion: "menú",
      fecha: AHORA.toISOString(),
    });
  });

  it("registra un pago de tarjeta por BCP con fecha dada", async () => {
    const r = await enviar({
      monto: "S/ 450.00",
      categoria: "Pago de tarjeta de crédito",
      medio: "BCP",
      fecha: "2026-10-31T13:45:00-05:00",
    });
    expect(r.body.mensaje).toBe("✓ S/ 450.00 · Tarjeta de crédito · BCP");
    expect(db.gastos[0].fecha).toBe("2026-10-31T18:45:00.000Z");
  });

  it("id_cliente repetido no duplica", async () => {
    const g = { monto: 3, categoria: "comidas", medio: "yape", id_cliente: "abc-1" };
    await enviar(g);
    const r = await enviar(g);
    expect(r.body.ok).toBe(true);
    expect(r.body.duplicado).toBe(true);
    expect(r.body.mensaje).toContain("ya estaba registrado");
    expect(db.gastos).toHaveLength(1);
  });

  it("monto inválido → error legible", async () => {
    const r = await enviar({ monto: "doce", categoria: "comidas", medio: "yape" });
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ ok: false, error: "El monto no es válido", errores: [{ indice: 0, error: "El monto no es válido" }] });
  });

  it("monto con 3 decimales → error", async () => {
    const r = await enviar({ monto: 1.234, categoria: "comidas", medio: "yape" });
    expect(r.body.error).toBe("El monto no es válido");
  });

  it("falta el monto", async () => {
    const r = await enviar({ monto: "", categoria: "comidas", medio: "yape" });
    expect(r.body.error).toBe("Falta el monto");
  });

  it("categoría inexistente o desactivada", async () => {
    expect((await enviar({ monto: 1, categoria: "viajes", medio: "yape" })).body.error).toBe(
      'No existe la categoría "viajes"',
    );
    expect((await enviar({ monto: 1, categoria: "bebidas", medio: "yape" })).body.error).toBe(
      'La categoría "Bebidas" está desactivada',
    );
  });

  it("medio inválido", async () => {
    const r = await enviar({ monto: 1, categoria: "comidas", medio: "visa" });
    expect(r.body.error).toBe("El medio debe ser yape, bcp, efectivo u otro");
  });

  it("JSON roto → 400", async () => {
    const r = await enviar("{monto:");
    expect(r.status).toBe(400);
    expect(r.body.error).toBe("El cuerpo no es un JSON válido");
  });

  it("NDJSON de pendientes: registra todos, ignora repetidos y descarta inválidos", async () => {
    await enviar({ monto: 1, categoria: "comidas", medio: "yape", id_cliente: "p1" });
    const ndjson = [
      JSON.stringify({ monto: 1, categoria: "comidas", medio: "yape", id_cliente: "p1" }),
      JSON.stringify({ monto: "x", categoria: "comidas", medio: "yape", id_cliente: "p2" }),
      JSON.stringify({ monto: 2, categoria: "comidas", medio: "bcp", id_cliente: "p3" }),
      JSON.stringify({ monto: 4, categoria: "comidas", medio: "efectivo", id_cliente: "p4" }),
      "",
    ].join("\n");
    const r = await enviar(ndjson);
    expect(r.body.ok).toBe(true);
    expect(r.body.registrados).toBe(2);
    expect(r.body.duplicados).toBe(1);
    expect(r.body.errores).toEqual([{ indice: 1, error: "El monto no es válido" }]);
    expect(r.body.mensaje).toBe(
      "✓ S/ 4.00 · Comidas · Efectivo · +1 pendiente enviado · ⚠️ 1 descartado: El monto no es válido",
    );
    expect(r.body.total_mes).toBe(7);
    expect(db.gastos).toHaveLength(3);
  });

  it("GET → 405", async () => {
    const res = await manejar(new Request("http://localhost/", { method: "GET" }), { token: TOKEN, repo: db.repo });
    expect(res.status).toBe(405);
  });
});

describe("leerCuerpo", () => {
  it("acepta objeto, arreglo, {gastos} y NDJSON con BOM", () => {
    expect(leerCuerpo('{"a":1}')).toEqual([{ a: 1 }]);
    expect(leerCuerpo('[{"a":1},{"a":2}]')).toHaveLength(2);
    expect(leerCuerpo('{"gastos":[{"a":1}]}')).toEqual([{ a: 1 }]);
    expect(leerCuerpo('﻿{"a":1}\r\n{"a":2}\r\n')).toEqual([{ a: 1 }, { a: 2 }]);
    // El atajo puede convertir su diccionario en JSON con saltos de línea.
    expect(leerCuerpo('\n{\n  "a": 1,\n  "b": "x}{"\n}\n{\n  "a": 2\n}')).toEqual([{ a: 1, b: "x}{" }, { a: 2 }]);
    expect(leerCuerpo('{"a":1}{"a":2}')).toEqual([{ a: 1 }, { a: 2 }]);
    expect(leerCuerpo('{"a":1}\n{roto')).toBeNull();
    expect(leerCuerpo("")).toBeNull();
  });
});
