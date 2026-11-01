# CLAUDE.md — Mis Gastos (PWA para iPhone · Yape / BCP)

El plan completo está en `plan.md`. Resumen:

- **Qué es:** registro de gastos personales. Al cerrar Yape o Banca Móvil BCP, un atajo de iOS muestra un recuadro (categoría, monto y nota) y envía el gasto a una Edge Function de Supabase. La PWA muestra los movimientos y los gráficos.
- **Stack:** Supabase (Postgres + Auth + Edge Functions, en la nube, sin Docker) · Vite + React 19 + TypeScript + Tailwind 4 + Recharts 3 + vite-plugin-pwa · Vercel (Root Directory `web`).
- **Zona horaria** `America/Lima` (UTC-5 fijo) · moneda PEN (`S/`).

## Estructura

```
supabase/migrations/       0001_init (tablas, RLS) · 0002_funciones (RPC de resúmenes) · 0003_seed (categorías)
supabase/functions/
  _shared/normalizar.ts    utilidades puras: monto, categoría, medio, fechas, token
  _shared/registrar.ts     lógica HTTP de la función (testeable, repo inyectado)
  registrar-gasto/index.ts adaptador Deno + supabase-js (service role, OWNER_USER_ID)
web/src/lib/               supabase, api, fechas, montos, colores, csv, database.types
web/src/pages/             Login, Inicio, Nuevo (también edita: /gasto/:id), Movimientos, Reportes, Ajustes
web/src/components/        ui, graficos (Recharts), Layout (barra inferior), FiltroRango
docs/                      setup.md (pasos manuales) · atajo-ios.md (atajo + automatizaciones)
```

## Convenciones

- Interfaz, dominio y nombres en **español**. TypeScript estricto.
- Los gráficos usan solo las RPC (`resumen_por_categoria`, `resumen_por_periodo`, `total_periodo`); no se agrega en el cliente, solo se completan los periodos vacíos con ceros.
- Fechas sin hora = texto `AAAA-MM-DD` de Lima (ver `web/src/lib/fechas.ts`). Instantes = ISO UTC.
- Colores de categoría: paleta categórica en orden fijo (`web/src/lib/colores.ts`). En la BD se guarda el tono claro y la PWA usa su pareja oscura. El color sigue a la categoría, nunca al ranking.
- Edge Function: errores en español legible (el atajo los muestra tal cual). Acepta un objeto, un arreglo, `{gastos:[…]}` o varios objetos JSON seguidos (la cola de pendientes del atajo). `id_cliente` evita duplicados.
- Comandos documentados para **PowerShell**. Supabase CLI vía `npx supabase …` (`db push`, `functions deploy --use-api`, `secrets set`).
- Tests: `npm test` (raíz, Edge Function) y `npm run test:web` (fechas y montos).
- Nunca commitear `.env*` ni tokens. Ante dudas, preguntar en vez de suponer.

## Decisiones que cambian el plan original

1. **Cola de pendientes en el atajo** en lugar del enlace de respaldo sin internet. Sin red, «Obtener contenido de URL» detiene el atajo y no se puede capturar el error. Detalle en `docs/atajo-ios.md`.
2. **Variación % de Inicio** frente al *mismo tramo* del mes anterior (del día 1 al mismo día), no al mes completo.
3. **Keepalive** opcional en GitHub Actions: Supabase gratis pausa el proyecto tras 7 días sin actividad.
