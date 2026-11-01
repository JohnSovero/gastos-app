# Puesta en marcha (Windows + PowerShell)

Todos los comandos son para **PowerShell** y se ejecutan desde la raíz del repo, salvo que se indique otra carpeta.

## 0. Herramientas

```powershell
node -v                  # Node.js LTS (20 o superior)
git --version
npx supabase --version   # Supabase CLI (se instala con npm install)
```

Instala las dependencias:

```powershell
npm install              # raíz: CLI de Supabase y tests de la Edge Function
cd web; npm install; cd ..
```

> **Recomendado:** saca el proyecto de la carpeta de **OneDrive**, por ejemplo a `C:\dev\gastos-app`. OneDrive intenta sincronizar `node_modules` (miles de archivos) y a veces bloquea archivos durante `npm install`, con errores `EPERM`. Para la app no cambia nada; solo es más rápido y estable.

## 1. Proyecto Supabase

1. En [supabase.com](https://supabase.com) → **New project**, región **South America (São Paulo)**, plan gratuito.
2. Enlaza el repo con el proyecto. El *project ref* es lo que va entre `https://` y `.supabase.co`:

   ```powershell
   npx supabase login
   npx supabase link --project-ref TU_PROJECT_REF
   ```

3. Crea las tablas, las funciones y las categorías:

   ```powershell
   npx supabase db push
   ```

> No uses `supabase start`, porque requiere Docker. Todo se hace contra el proyecto en la nube.

## 2. Tu usuario (uno solo)

1. Dashboard → **Authentication → Users → Add user → Create new user**: escribe tu correo y contraseña y marca **Auto Confirm User**.
2. Copia el **UUID** del usuario: lo usarás como `OWNER_USER_ID`.
3. **Desactiva el registro público**: Authentication → **Sign In / Providers** → apaga **Allow new users to sign up**.

## 3. Claves para la PWA

En Dashboard → **Project Settings → API Keys** copia la **URL** del proyecto y la **anon key** (o la *publishable key* `sb_publishable_…`; las dos funcionan). Es pública: la protege RLS.

```powershell
cd web
Copy-Item .env.example .env.local
notepad .env.local      # completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
cd ..
```

## 4. Token del atajo y secretos de la Edge Function

Genera un token aleatorio de 32 bytes:

```powershell
$b = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
$TOKEN = [Convert]::ToBase64String($b).TrimEnd('=').Replace('+','-').Replace('/','_')
$TOKEN   # guárdalo en tu gestor de contraseñas: lo pondrás en el atajo
```

Cárgalo junto con tu UUID:

```powershell
npx supabase secrets set INGEST_TOKEN=$TOKEN OWNER_USER_ID=TU-UUID
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta Supabase automáticamente.

## 5. Desplegar la Edge Function

```powershell
npm run functions:deploy
# equivale a: npx supabase functions deploy registrar-gasto --no-verify-jwt --use-api
```

`--use-api` empaqueta la función en los servidores de Supabase, así que no necesitas Docker.

## 6. Probar la función (aceptación fase 1)

Define estas variables una vez por sesión de PowerShell:

```powershell
$URL   = "https://TU_PROJECT_REF.supabase.co/functions/v1/registrar-gasto"
$TOKEN = "el-token-del-paso-4"

function Enviar($cuerpo, $token = $TOKEN) {
  $json  = $cuerpo | ConvertTo-Json -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)   # para que las tildes lleguen bien
  $h = @{}; if ($token) { $h["x-api-key"] = $token }
  try   { Invoke-RestMethod -Method Post -Uri $URL -Headers $h -ContentType "application/json; charset=utf-8" -Body $bytes }
  catch { "HTTP $($_.Exception.Response.StatusCode.value__): $($_.ErrorDetails.Message)" }
}
```

```powershell
# Yape, monto con coma y categoría en minúsculas → ok, "✓ S/ 12.50 · Comidas · Yape"
Enviar @{ monto = "12,50"; categoria = "comidas"; medio = "yape"; descripcion = "menú" }

# BCP, pago de tarjeta por nombre → ok, categoría Tarjeta de crédito
Enviar @{ monto = "S/ 450.00"; categoria = "Pago de tarjeta de crédito"; medio = "bcp" }

# id_cliente repetido: la segunda vez dice "(ya estaba registrado)" y no duplica
Enviar @{ monto = 3; categoria = "Bebidas"; medio = "yape"; id_cliente = "prueba-1" }
Enviar @{ monto = 3; categoria = "Bebidas"; medio = "yape"; id_cliente = "prueba-1" }

# Sin token → HTTP 401
Enviar @{ monto = 5; categoria = "comidas"; medio = "yape" } $null

# Monto inválido → HTTP 400: {"ok":false,"error":"El monto no es válido",...}
Enviar @{ monto = "doce"; categoria = "comidas"; medio = "yape" }

# A las 23:30 de Lima (para la prueba de la fase 4)
Enviar @{ monto = 10; categoria = "otros"; medio = "efectivo"; fecha = "2026-10-31T23:30:00-05:00"; id_cliente = "prueba-2330" }
```

Con `curl.exe` (no uses el alias `curl` de PowerShell). Es más fácil poner el JSON en un archivo:

```powershell
'{"monto":"12,50","categoria":"comidas","medio":"yape"}' | Out-File -Encoding utf8NoBOM prueba.json   # PowerShell 7
# En Windows PowerShell 5.1 usa: [IO.File]::WriteAllText("$PWD\prueba.json", '{"monto":"12,50","categoria":"comidas","medio":"yape"}')
curl.exe -s -X POST $URL -H "x-api-key: $TOKEN" -H "Content-Type: application/json" --data-binary "@prueba.json"
curl.exe -s -X POST $URL --data-binary "@prueba.json"          # sin token → {"ok":false,...} 401
Remove-Item prueba.json
```

Borra las pruebas desde el SQL Editor cuando termines:

```sql
delete from gastos where id_cliente like 'prueba-%' or descripcion = 'menú';
```

### RLS: la anon key sin sesión no lee nada

```powershell
$ANON = "tu-anon-key"
Invoke-RestMethod "https://TU_PROJECT_REF.supabase.co/rest/v1/gastos?select=*" -Headers @{ apikey = $ANON; Authorization = "Bearer $ANON" }
# Esperado: error 401/permission denied, o [] (nunca tus gastos)
```

## 7. PWA en local y en el iPhone (misma Wi-Fi)

```powershell
cd web
npm run dev -- --host
```

En el iPhone abre en Safari `http://<IP-de-tu-PC>:5173`. La IP la ves con `ipconfig`, en «Dirección IPv4». Si no carga, permite **Node.js** en el Firewall de Windows (redes privadas). En modo desarrollo no se puede *instalar* la PWA: para eso hace falta la URL HTTPS de Vercel.

Tests:

```powershell
npm test             # raíz: Edge Function
npm run test:web     # utilidades de fechas y montos
```

## 8. GitHub (privado) + Vercel

```powershell
git remote add origin https://github.com/TU_USUARIO/gastos-app.git
git push -u origin main
```

En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo:

- **Root Directory**: `web`
- Framework: **Vite** (lo detecta solo). Build: `npm run build`. Output: `dist`.
- **Environment Variables**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

Cada `git push` vuelve a desplegar. `web/vercel.json` reescribe las rutas a `index.html`, para que `/nuevo?...` funcione al abrirlo directo.

## 9. En el iPhone

1. Abre `https://<app>.vercel.app` en **Safari** → **Compartir** → **Añadir a pantalla de inicio**.
2. Abre «Mis Gastos» desde el ícono e inicia sesión. La sesión queda guardada.
3. Crea el atajo y las automatizaciones con [`atajo-ios.md`](atajo-ios.md).

## 10. (Opcional) Evitar que Supabase pause el proyecto

En el plan gratuito, Supabase **pausa el proyecto tras 7 días sin actividad**. Si pasa, el atajo falla hasta que lo reactives en el dashboard. Si registras gastos a diario no ocurre. Para estar seguro, el repo trae `.github/workflows/keepalive.yml`, que hace una consulta ligera cada 3 días (gratis en GitHub Actions). Actívalo así: GitHub → repo → **Settings → Secrets and variables → Actions** → crea `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

## 11. Tipos de TypeScript

`web/src/lib/database.types.ts` está escrito a mano con el formato oficial. Cuando cambies el esquema, regéneralo:

```powershell
npm run types
```

## 12. Verificar los gráficos (aceptación fase 4)

En el SQL Editor, compara con lo que muestra Reportes en el mismo rango:

```sql
-- Total por categoría de octubre 2026, en hora de Lima
select categoria_id, sum(monto) total, count(*) n
from gastos
where (fecha at time zone 'America/Lima')::date between '2026-10-01' and '2026-10-31'
group by 1 order by 2 desc;

-- El gasto de las 23:30 debe caer el 31, no el 1 de noviembre
select fecha, (fecha at time zone 'America/Lima')::date dia_lima
from gastos where id_cliente = 'prueba-2330';
```
