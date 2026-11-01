# PLAN.md — App de gastos personales para iPhone (Perú · Yape / BCP)

> Documento para Claude Code. Léelo completo antes de escribir código. Trabaja por fases, en orden, y no pases a la siguiente sin cumplir sus criterios de aceptación.
>
> **Entorno de desarrollo: PC con Windows, sin Mac.** La app es una **PWA** (app web instalable en el iPhone desde Safari). No hay app nativa iOS ni lectura de correos.

---

## 0. Objetivo y reglas del negocio

**Objetivo:** registrar cada gasto que hago con Yape o con la app Banca Móvil BCP mediante un recuadro que aparece en el iPhone justo después de pagar, y ver mis gastos en gráficos de barras por categoría y por fecha.

**Categorías iniciales:**
Transporte · Educación · Bebidas · Comidas · Gastos de la casa · Servicios · **Tarjeta de crédito** · Otros

**Cómo entra cada gasto (una sola vía, sin correos):**

| Medio | Disparador | Qué registro |
|---|---|---|
| **Yape** (incluye pago de servicios) | Al **cerrar Yape** aparece el recuadro | Categoría, monto y nota opcional. La hora se pone sola |
| **Banca Móvil BCP** (incluye pago de tarjeta de crédito) | Al **cerrar Banca Móvil BCP** aparece el recuadro | Igual |
| **Efectivo u otro** | Botón del atajo en la pantalla de inicio o Centro de control, o desde la propia app | Igual |

**Tarjeta de crédito:** el pago de la tarjeta se registra como un gasto con categoría `tarjeta` y aparece en la app. Ese pago cubre compras hechas antes, así que la categoría lleva la marca `es_pago_deuda = true`. En Inicio y Reportes hay un interruptor **"Incluir pagos de tarjeta"**, activado por defecto, para poder ver el total con o sin ese pago.

**Lo que iOS NO permite (no intentar):** leer notificaciones o datos de Yape/BCP, ni detectar si dentro de la app hubo un pago. Por eso el recuadro sale **cada vez que se cierra** la app y tiene la opción "No fue un gasto".

---

## 1. Arquitectura

```
 Yape ─────────(al cerrar)──┐
 Banca Móvil BCP (al cerrar)┤──► Atajo iOS "Registrar gasto"
 Botón manual ──────────────┘     categoría + monto + nota + hora automática
                                          │ POST + x-api-key
                                          ▼
                              Supabase Edge Function "registrar-gasto"
                                          │
                                          ▼
                                  Postgres (Supabase)
                                          │
                                          ▼
                       PWA en iPhone (React + Recharts)
                       login · nuevo · movimientos · gráficos
```

**Stack:**
- BD y API: **Supabase** (Postgres + Auth + Edge Functions), plan gratuito, proyecto en la nube.
- Frontend: **Vite + React + TypeScript + Tailwind + Recharts + supabase-js**, PWA con `vite-plugin-pwa`, hosteada en **Vercel**.
- Zona horaria `America/Lima`, moneda PEN (`S/`).

### 1.1 Herramientas en Windows
- Node.js LTS, Git for Windows y VS Code. Comandos en PowerShell.
- Supabase CLI vía `npx supabase ...`. **No usar `supabase start` (requiere Docker).** Trabajar contra el proyecto en la nube: `npx supabase link`, `npx supabase db push`, `npx supabase functions deploy`.
- Vercel: deploy automático conectando el repo de GitHub, o `npx vercel`.
- Probar en el iPhone durante el desarrollo: `npm run dev -- --host` y abrir `http://<IP-PC>:5173` en Safari con la misma Wi-Fi. Si no carga, permitir Node en el Firewall de Windows. Para instalar la PWA se usa la URL HTTPS de Vercel.
- Scripts de `package.json` multiplataforma: usar `rimraf` y `cross-env` si hace falta.

---

## 2. Estructura del repositorio

```
gastos-app/
├── CLAUDE.md                     # resumen del plan + convenciones
├── PLAN.md
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql         # tablas, índices, RLS
│   │   ├── 0002_funciones.sql    # resúmenes para gráficos
│   │   └── 0003_seed.sql         # categorías
│   └── functions/registrar-gasto/index.ts
├── web/
│   ├── public/ (manifest.webmanifest, iconos, apple-touch-icon.png)
│   └── src/
│       ├── lib/ (supabase.ts, fechas.ts, montos.ts)
│       ├── pages/ (Login, Inicio, Nuevo, Movimientos, Reportes, Ajustes)
│       └── components/
└── docs/
    ├── setup.md                  # pasos manuales
    └── atajo-ios.md              # cómo crear el atajo y las automatizaciones
```

---

## 3. Modelo de datos (`0001_init.sql`)

```sql
create table categorias (
  id             text primary key,   -- transporte, educacion, bebidas, comidas, casa, servicios, tarjeta, otros
  nombre         text not null,
  color          text not null,      -- hex
  icono          text,               -- emoji
  orden          int  not null default 0,
  es_pago_deuda  boolean not null default false,   -- true solo para 'tarjeta'
  activa         boolean not null default true
);

create table gastos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id),
  monto           numeric(12,2) not null check (monto > 0),
  categoria_id    text not null references categorias(id),
  fecha           timestamptz not null,
  medio           text not null check (medio in ('yape','bcp','efectivo','otro')),
  fuente          text not null check (fuente in ('atajo','app')),
  descripcion     text,
  id_cliente      text,       -- id único generado por el atajo/app para evitar duplicados
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create unique index gastos_id_cliente_uniq on gastos(user_id, id_cliente) where id_cliente is not null;
create index gastos_fecha_idx on gastos(user_id, fecha desc);

alter table gastos     enable row level security;
alter table categorias enable row level security;

create policy "propios gastos" on gastos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categorias lectura" on categorias for select
  using (auth.role() = 'authenticated');
create policy "categorias edicion" on categorias for update
  using (auth.role() = 'authenticated');
```

**Seed (`0003_seed.sql`):**

| id | nombre | icono | es_pago_deuda |
|---|---|---|---|
| transporte | Transporte | 🚌 | false |
| educacion | Educación | 📚 | false |
| bebidas | Bebidas | 🥤 | false |
| comidas | Comidas | 🍽️ | false |
| casa | Gastos de la casa | 🏠 | false |
| servicios | Servicios (luz, agua, internet, celular) | 💡 | false |
| tarjeta | Tarjeta de crédito | 💳 | **true** |
| otros | Otros | 📦 | false |

Colores distinguibles entre sí y legibles en modo claro y oscuro. Trigger para `actualizado_en`.

---

## 4. Funciones SQL para gráficos (`0002_funciones.sql`)

Todas con `security invoker` (respetan RLS) y agrupando con `fecha at time zone 'America/Lima'`.

```sql
resumen_por_categoria(desde date, hasta date, incluir_tarjeta boolean default true, medio text default null)
  → (categoria_id, nombre, color, icono, total numeric, cantidad int)

resumen_por_periodo(desde date, hasta date, granularidad text,   -- 'dia'|'semana'|'mes'
                    incluir_tarjeta boolean default true, medio text default null)
  → (periodo date, categoria_id, total numeric)

total_periodo(desde date, hasta date, incluir_tarjeta boolean default true)
  → (total numeric, cantidad int)
```

`incluir_tarjeta = false` excluye las categorías con `es_pago_deuda = true`. Las semanas empiezan en lunes.

---

## 5. Edge Function `registrar-gasto`

- `POST /functions/v1/registrar-gasto`, desplegada con `--no-verify-jwt`.
- Auth: header `x-api-key` comparado en tiempo constante con el secreto `INGEST_TOKEN`. Sin token o con uno inválido → 401.
- Secretos: `INGEST_TOKEN`, `OWNER_USER_ID`. La service role key es automática.
- Body:
  ```json
  {
    "monto": "12,50",              // acepta "12,50", "12.5", "S/ 12.50", 12.5
    "categoria": "Comidas",        // id o nombre; normalizar tildes y mayúsculas
    "medio": "yape",               // yape | bcp | efectivo | otro
    "fecha": "2026-10-31T13:45:00-05:00",   // opcional → now()
    "descripcion": "menú",         // opcional
    "id_cliente": "..."            // opcional; si se repite, devolver el existente
  }
  ```
- Validar con zod. Monto > 0 y como máximo 2 decimales. Categoría existente y activa.
- Respuesta OK: `{ ok: true, mensaje: "✓ S/ 12.50 · Comidas · Yape", gasto: {...}, total_mes: 845.30 }`. El atajo muestra `mensaje` y el total del mes.
- Error: `{ ok: false, error: "El monto no es válido" }`, en español legible porque el atajo lo muestra tal cual.
- `docs/setup.md` incluye ejemplos de prueba con `curl.exe` y `Invoke-RestMethod` (PowerShell).

---

## 6. El recuadro: Atajos de iOS (pieza central)

Claude Code no puede generar un `.shortcut` firmado. **Escribe `docs/atajo-ios.md` paso a paso**, con los nombres de las acciones en español tal como aparecen en iOS.

### 6.1 Atajo "Registrar gasto"
Recibe como entrada el medio: `yape`, `bcp` o vacío.
1. **Abrir app → Atajos.** En algunos iPhone los menús de una automatización se traban si se muestran fuera de esta app; este paso lo evita.
2. **Si** la entrada es `bcp` → **Elegir del menú** "¿Qué hiciste en BCP?": **Pago de tarjeta de crédito** · Otro gasto · No fue un gasto.
   - Si elijo "Pago de tarjeta de crédito", categoría = `tarjeta` y salta al paso 4.
   - Si elijo "No fue un gasto", **Detener atajo**.
3. **Elegir del menú** "¿En qué gastaste?": Transporte · Educación · Bebidas · Comidas · Gastos de la casa · Servicios · Otros · **No fue un gasto** (esta última → **Detener atajo**).
4. **Solicitar entrada (Número)** "Monto en S/". Si queda vacío, mostrar alerta y volver a pedir.
5. **Solicitar entrada (Texto)** "Nota (opcional)".
6. Si la entrada del atajo está vacía → **Elegir del menú** medio: Yape · BCP · Efectivo.
7. **Fecha actual** → **Formatear fecha** ISO 8601. Generar `id_cliente` con la fecha en milisegundos más un número aleatorio.
8. **Obtener contenido de URL**: POST a `https://<proyecto>.supabase.co/functions/v1/registrar-gasto` con header `x-api-key` y cuerpo JSON `{monto, categoria, medio, fecha, descripcion, id_cliente}`.
9. **Si** `ok` → **Mostrar notificación** con `mensaje` y "Este mes: S/ total_mes".
   **Si no** → **Mostrar alerta** con el error y botón para abrir `https://<app>.vercel.app/nuevo?monto=..&categoria=..&medio=..&fecha=..`, para no perder el gasto (p. ej. sin internet).
10. **Ir a pantalla de inicio** (opcional).

### 6.2 Automatizaciones (Atajos → Automatización → +)
- **App → Yape → "Se cierra"** → *Ejecutar inmediatamente* → Ejecutar "Registrar gasto" con entrada `yape`.
- **App → Banca Móvil BCP → "Se cierra"** → *Ejecutar inmediatamente* → Ejecutar "Registrar gasto" con entrada `bcp`.
- Desactivar "Notificar al ejecutar" en ambas.

### 6.3 Accesos extra
- "Registrar gasto" en la pantalla de inicio y en el Centro de control, para gastos en efectivo.
- Opcional: Ajustes → Accesibilidad → Tocar → **Tocar atrás** → "Registrar gasto".

**Limitación a explicar:** el recuadro sale cada vez que se cierra Yape o BCP, aunque solo haya entrado a ver el saldo o a cobrar. Se descarta con "No fue un gasto".

---

## 7. Frontend PWA (`web/`)

### 7.1 PWA en iPhone
- `manifest.webmanifest` con `display: standalone`, nombre "Mis Gastos" e iconos 192 y 512. `apple-touch-icon.png` de 180×180, `apple-mobile-web-app-capable`, `viewport-fit=cover` y márgenes `env(safe-area-inset-*)`.
- El service worker solo cachea la interfaz. Los datos se piden siempre en vivo.
- Mobile-first, modo oscuro automático, botones de al menos 44 px. Monto con `inputmode="decimal"`.
- Navegación con barra inferior: Inicio · Movimientos · Reportes · Ajustes, más un botón "+" central.

### 7.2 Auth
Supabase Auth con email y contraseña, un solo usuario. Deshabilitar el registro público después de crear mi cuenta. Sesión persistente.

### 7.3 Pantallas
1. **Inicio:**
   - Total del mes y variación % frente al mes anterior.
   - **Barras horizontales por categoría** del mes.
   - Interruptor "Incluir pagos de tarjeta".
   - Últimos 5 gastos.
2. **Nuevo gasto:** monto, chips de categoría, medio (Yape/BCP/Efectivo), nota, y fecha/hora con el momento actual (editables). Acepta parámetros por URL (`/nuevo?monto=&categoria=&medio=&fecha=`) para el respaldo del atajo.
3. **Movimientos:** lista agrupada por día con total diario y filtros (rango, categoría, medio). Al tocar se edita o elimina (con confirmación).
4. **Reportes:**
   - Rango: Esta semana · Este mes · Mes pasado · Últimos 3 meses · Este año · Personalizado.
   - **Barras por categoría** del rango.
   - **Barras por fecha** (día, semana o mes según el rango) **apiladas por categoría**. La leyenda permite activar o desactivar categorías.
   - Filtros: medio e "Incluir pagos de tarjeta".
   - Tabla con categoría, total, % y nº de gastos. Exportar CSV.
5. **Ajustes:** categorías (nombre, color, ícono, activar o desactivar), cerrar sesión. Ayuda para el atajo: muestra la URL de la Edge Function (el token nunca).

### 7.4 Gráficos y formato
- Recharts (`BarChart`, `Bar` con `stackId`). Datos desde las RPC; no agregar en el cliente.
- `Intl.NumberFormat('es-PE', {style:'currency', currency:'PEN'})` e `Intl.DateTimeFormat('es-PE', {timeZone:'America/Lima'})`.
- Estados vacíos claros ("Aún no hay gastos en este rango").

### 7.5 Despliegue
Vercel con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (pública, la protege RLS). En el iPhone: abrir la URL en **Safari** → Compartir → **Añadir a pantalla de inicio**.

---

## 8. Fases y criterios de aceptación

| Fase | Entregable | Aceptación |
|---|---|---|
| **0. Preparación** | Repo, `CLAUDE.md`, `docs/setup.md`, verificación de herramientas | `node -v`, `git` y `npx supabase --version` funcionan; proyecto Supabase enlazado |
| **1. Backend** | Migraciones, seed, funciones de resumen, Edge Function | Pruebas con `curl.exe`: inserta Yape y BCP; normaliza "12,50" y "comidas"; `id_cliente` repetido no duplica; sin token → 401; monto inválido → error legible |
| **2. PWA base** | Login, Nuevo gasto, Movimientos, edición, deploy en Vercel | Instalada en el iPhone; un gasto creado ahí se ve en Supabase y en Movimientos |
| **3. Atajo iOS** | `docs/atajo-ios.md` + las dos automatizaciones | Al cerrar Yape aparece el recuadro y el gasto llega con la hora correcta; al cerrar BCP aparece la opción "Pago de tarjeta de crédito"; "No fue un gasto" no registra nada; sin internet aparece la alerta con el enlace de respaldo |
| **4. Gráficos** | Inicio y Reportes | Totales cuadran con una consulta SQL manual; un gasto a las 23:30 de Lima cae en el día correcto; el interruptor de tarjeta cambia los totales; barras apiladas correctas |
| **5. Extras (opcional)** | Presupuesto mensual por categoría con barra de avance, búsqueda por nota, gastos recurrentes (p. ej. internet mensual) | — |

Al cerrar cada fase: resumen breve y lista de lo que debo hacer a mano.

---

## 9. Seguridad y privacidad

- Nunca commitear secretos (`.env`, `INGEST_TOKEN`, service role key). Incluir `.env.example`. Repositorio **privado**.
- `INGEST_TOKEN` de 32+ bytes aleatorios. Si se filtra, rotarlo en Supabase y en el atajo.
- RLS en todas las tablas. Probar que la anon key sin sesión no lee nada.
- No guardar números de tarjeta ni de cuenta. Si se escriben en la nota, no hacer nada especial, pero la interfaz no los pide.

---

## 10. Pasos que debo hacer yo (en `docs/setup.md`)

1. Instalar Node.js LTS, Git y VS Code en Windows.
2. Crear un proyecto en supabase.com (región São Paulo) → `npx supabase login` y `npx supabase link`.
3. Crear mi usuario en Supabase Auth y copiar su UUID a `OWNER_USER_ID`. Desactivar el registro público.
4. Generar `INGEST_TOKEN` y cargarlo como secreto en Supabase.
5. Crear repo privado en GitHub y conectarlo a Vercel.
6. En el iPhone: instalar la PWA desde Safari y crear el atajo y las dos automatizaciones siguiendo `docs/atajo-ios.md`.

---

## 11. Convenciones para Claude Code

- Interfaz y dominio en español. TypeScript estricto. Tipos generados con `npx supabase gen types typescript --linked`.
- Tests con vitest para utilidades de monto y fecha, y pruebas de la Edge Function.
- Todo comando documentado debe funcionar en **PowerShell**.
- Commits pequeños por fase.
- Ante dudas (nombres exactos de acciones en Atajos, categorías nuevas), **preguntar en vez de suponer**.