# Atajo de iOS «Registrar gasto» y automatizaciones

Esta guía arma el recuadro que aparece al cerrar Yape o Banca Móvil BCP. Se hace a mano en la app **Atajos** del iPhone (iOS 17 o superior).

> **Nombres de las acciones.** Van en español, con el nombre en inglés entre paréntesis. Apple cambia algunos nombres entre versiones de iOS. Si una acción no aparece con ese nombre, busca una palabra clave (por ejemplo «archivo» o «URL») en el buscador de acciones.

## Qué necesitas antes

| Dato | Dónde está |
|---|---|
| URL de la función | `https://<proyecto>.supabase.co/functions/v1/registrar-gasto`. Se copia desde **Ajustes** en la PWA |
| `INGEST_TOKEN` | El que generaste en `docs/setup.md` §4 (guárdalo en tu gestor de contraseñas) |
| URL de la PWA | `https://<app>.vercel.app` |
| iCloud Drive | Activado en Ajustes → [tu nombre] → iCloud → iCloud Drive. Ahí se guarda la carpeta **Atajos** que usa la cola de pendientes. Si no lo usas, elige una carpeta de «En mi iPhone» en los pasos 9 y 13 |

## Cómo funciona la cola de pendientes (cambio respecto al PLAN)

Si no hay internet, iOS **detiene el atajo con un error** en la acción «Obtener contenido de URL». Atajos no tiene «try/catch», así que el plan original (mostrar una alerta con un enlace) nunca se ejecutaría y el gasto se perdería. Además, el enlace abre Safari, no la PWA instalada, y sin internet tampoco cargaría.

Por eso el atajo funciona así:

1. **Primero guarda** el gasto en el archivo `Atajos/gastos-pendientes.txt`.
2. Después envía **todo el archivo** a la función.
3. Si el envío sale bien, **borra el archivo**.

Si no había señal, el gasto queda en el archivo y se envía solo la próxima vez que registres algo, o al usar el atajo «Enviar pendientes» del final. Cada gasto lleva su `id_cliente`, así que reenviarlo nunca lo duplica.

---

## 1. Crear el atajo «Registrar gasto»

Atajos → pestaña **Atajos** → **+** → nombre: **Registrar gasto**. Toca el ícono para ponerle color y glifo.

En los detalles del atajo (ⓘ): activa **Mostrar en la hoja de compartir** = no. En **Recibir**, deja *Texto* y en «Si no hay entrada» elige **Continuar**.

Agrega estas acciones en orden. Las sangrías indican qué va dentro de cada «Si» o «Elegir del menú».

### Paso 1 — Abrir Atajos
1. **Abrir app** (Open App) → *Atajos*.
   En algunos iPhone los menús de una automatización se traban si se muestran fuera de esta app; este paso lo evita.

### Paso 2 — Menú especial para BCP
2. **Si** (If) → *Entrada del atajo* · **es** · `bcp`
   - **Elegir del menú** (Choose from Menu) → mensaje: `¿Qué hiciste en BCP?` → opciones:
     - **Pago de tarjeta de crédito**
       - **Texto** (Text) → `tarjeta`
       - **Definir variable** (Set Variable) → nombre `Categoria` ← *Texto*
     - **Otro gasto** → (sin acciones)
     - **No fue un gasto**
       - **Detener este atajo** (Stop This Shortcut)
   - **Fin del menú**
3. **Fin del Si** (no hace falta un «Si no»).

### Paso 3 — Categoría
4. **Si** → *Categoria* · **no tiene ningún valor** (does not have any value)
   - **Elegir del menú** → mensaje: `¿En qué gastaste?` → opciones (una acción **Texto** y una **Definir variable `Categoria`** dentro de cada una):

     | Opción del menú | Texto |
     |---|---|
     | 🚌 Transporte | `transporte` |
     | 📚 Educación | `educacion` |
     | 🥤 Bebidas | `bebidas` |
     | 🍽️ Comidas | `comidas` |
     | 🏠 Gastos de la casa | `casa` |
     | 💡 Servicios | `servicios` |
     | 📦 Otros | `otros` |
     | No fue un gasto | → **Detener este atajo** (sin Texto) |

   - **Fin del menú**
5. **Fin del Si**

> Se envía el **id** de la categoría (`comidas`, `casa`…), no el nombre. Así, aunque cambies el nombre en Ajustes, el atajo sigue funcionando. La función también acepta el nombre.

### Paso 4 — Monto
6. **Solicitar entrada** (Ask for Input) → tipo **Número** → pregunta `Monto en S/`. Toca *Mostrar más*: **Permitir decimales** sí, **Permitir negativos** no.
7. **Definir variable** → `Monto` ← *Entrada proporcionada*
8. **Si** → *Monto* · **no tiene ningún valor**
   - **Mostrar alerta** (Show Alert) → `Escribe el monto del gasto` (desactiva «Mostrar Cancelar»)
   - **Solicitar entrada** → **Número** → `Monto en S/`
   - **Definir variable** → `Monto` ← *Entrada proporcionada*
   - **Si** → *Monto* · **no tiene ningún valor** → **Detener este atajo** → **Fin del Si**
9. **Fin del Si**

### Paso 5 — Nota
10. **Solicitar entrada** → **Texto** → `Nota (opcional)`. Déjalo vacío para no poner nota.
11. **Definir variable** → `Nota` ← *Entrada proporcionada*

### Paso 6 — Medio (solo si no vino de Yape o BCP)
12. **Texto** → *Entrada del atajo*
13. **Definir variable** → `Medio` ← *Texto*
14. **Si** → *Medio* · **no tiene ningún valor**
    - **Elegir del menú** → `¿Cómo pagaste?` → opciones **Yape** / **BCP** / **Efectivo**. Dentro de cada una: **Texto** `yape` / `bcp` / `efectivo` → **Definir variable `Medio`**
    - **Fin del menú**
15. **Fin del Si**

### Paso 7 — Fecha e id único
16. **Fecha actual** (Current Date)
17. **Formatear fecha** (Format Date) → formato **ISO 8601** → activa **Incluir hora** (Include Time)
18. **Definir variable** → `Fecha` ← *Fecha formateada*. Queda como `2026-10-31T13:45:00-05:00`.
19. **Fecha actual**
20. **Formatear fecha** → formato **Personalizado** → `yyyyMMddHHmmssSSS`
21. **Número aleatorio** (Random Number) → mínimo `1000`, máximo `9999`
22. **Texto** → *Fecha formateada* `-` *Número aleatorio*
23. **Definir variable** → `IdCliente` ← *Texto*

### Paso 8 — Armar el gasto
24. **Diccionario** (Dictionary) con estas claves:

    | Clave | Tipo | Valor |
    |---|---|---|
    | `monto` | Número | *Monto* |
    | `categoria` | Texto | *Categoria* |
    | `medio` | Texto | *Medio* |
    | `fecha` | Texto | *Fecha* |
    | `descripcion` | Texto | *Nota* |
    | `id_cliente` | Texto | *IdCliente* |

25. **Definir variable** → `Gasto` ← *Diccionario*

### Paso 9 — Guardarlo en la cola antes de enviar
26. **Obtener archivo** (Get File) → carpeta **Atajos** (iCloud Drive) → ruta `gastos-pendientes.txt` → **desactiva** «Error si no se encuentra» (Error If Not Found).
27. **Definir variable** → `Pendientes` ← *Archivo*
28. **Texto** → escribe *Pendientes*, un salto de línea y *Gasto*:
    ```
    [Pendientes]
    [Gasto]
    ```
29. **Definir variable** → `Envio` ← *Texto*
30. **Definir nombre** (Set Name) → *Envio* → nombre `gastos-pendientes.txt`
31. **Guardar archivo** (Save File) → desactiva **Preguntar dónde guardar** → carpeta **Atajos** → activa **Sobrescribir si el archivo existe** (Overwrite If File Exists).

### Paso 10 — Enviar
32. **Obtener contenido de URL** (Get Contents of URL) → URL: `https://<proyecto>.supabase.co/functions/v1/registrar-gasto` → *Mostrar más*:
    - **Método**: `POST`
    - **Encabezados**:
      - `x-api-key` → *tu INGEST_TOKEN*
      - `Content-Type` → `text/plain`
    - **Cuerpo de la solicitud**: **Archivo** (File) → *Envio*
33. **Definir variable** → `Respuesta` ← *Contenido de la URL*
34. **Obtener valor del diccionario** (Get Dictionary Value) → **Valor** de `mensaje` en *Respuesta*

### Paso 11 — Resultado
35. **Si** → *Valor del diccionario* · **tiene algún valor** (has any value). Si existe `mensaje`, la función respondió `ok: true`.
    - **Obtener archivo** → Atajos → `gastos-pendientes.txt` (sin error si no existe)
    - **Eliminar archivos** (Delete Files) → *Archivo* → desactiva **Confirmar antes de eliminar** (Confirm Before Deleting)
    - **Obtener valor del diccionario** → `total_mes_texto` en *Respuesta*
    - **Mostrar notificación** (Show Notification) → título: *mensaje* (el valor del paso 34) → cuerpo: `Este mes: ` *Valor del diccionario*
36. **Si no** (Otherwise)
    - **Obtener valor del diccionario** → `error` en *Respuesta*
    - **Elegir del menú** → mensaje: `No se registró: ` *Valor del diccionario* → opciones:
      - **Reintentar después**: sin acciones. El gasto queda en la cola y se envía la próxima vez.
      - **Descartar pendientes**: **Obtener archivo** `gastos-pendientes.txt` → **Eliminar archivos**. Úsalo si el error es de datos, como un monto inválido.
      - **Abrir en la app**:
        - **Codificar URL** (URL Encode) → *Nota* → **Definir variable** `NotaURL`
        - **Codificar URL** → *Fecha* → **Definir variable** `FechaURL`
        - **Abrir URL** (Open URLs) → `https://<app>.vercel.app/nuevo?monto=[Monto]&categoria=[Categoria]&medio=[Medio]&fecha=[FechaURL]&nota=[NotaURL]&id_cliente=[IdCliente]`
    - **Fin del menú**
37. **Fin del Si**

### Paso 12 — (Opcional) volver al inicio
38. **Ir a la pantalla de inicio** (Go to Home Screen)

---

## 2. Automatizaciones (Atajos → Automatización → +)

### Yape
1. **Automatización personal** → **App**.
2. Elegir app: **Yape**. Marca **Se cierra** (Is Closed) y desmarca «Se abre».
3. Elige **Ejecutar inmediatamente** (Run Immediately) y desactiva **Notificar al ejecutar** (Notify When Run).
4. Siguiente → **Nueva automatización en blanco** → acción **Ejecutar atajo** (Run Shortcut) → *Registrar gasto*. Toca la flecha → **Entrada** → Texto `yape`.

### Banca Móvil BCP
Igual que la de Yape, con la app **Banca Móvil BCP** y la entrada `bcp`.

> Si «Ejecutar atajo» no deja escribir la entrada, pon antes una acción **Texto** `yape` y pásala como entrada de «Ejecutar atajo».

---

## 3. Accesos extra (gastos en efectivo)

- **Pantalla de inicio**: en el atajo, ⓘ → **Añadir a pantalla de inicio**.
- **Centro de control** (iOS 18): abre el Centro de control → **+** → **Añadir un control** → *Atajos* → elige **Registrar gasto**.
- **Tocar atrás** (opcional): Ajustes → Accesibilidad → Tocar → **Tocar atrás** → *Doble toque* → **Registrar gasto**.

Si lo abres desde uno de estos accesos, la entrada viene vacía y el atajo te pregunta el medio: Yape, BCP o Efectivo.

---

## 4. (Opcional) Atajo «Enviar pendientes»

Sirve para vaciar la cola sin registrar un gasto nuevo, por ejemplo con una automatización diaria a las 21:00.

1. **Obtener archivo** → Atajos → `gastos-pendientes.txt` (sin error si no existe)
2. **Si** → *Archivo* · **no tiene ningún valor** → **Detener este atajo** → **Fin del Si**
3. **Obtener contenido de URL**: igual que el paso 32, con **Cuerpo** → Archivo → *Archivo*
4. **Obtener valor del diccionario** → `mensaje`
5. **Si** tiene algún valor → **Obtener archivo** + **Eliminar archivos** (sin confirmar) → **Mostrar notificación** *mensaje* → **Fin del Si**

Automatización: **Hora del día** → 21:00 → Diariamente → **Ejecutar inmediatamente** → *Enviar pendientes*.

---

## 5. Limitaciones (iOS no permite más)

- **El recuadro sale cada vez que cierras Yape o BCP**, aunque solo hayas entrado a ver el saldo o a cobrar. iOS no deja que un atajo sepa si dentro de la app hubo un pago. Descártalo con **No fue un gasto**.
- iOS considera que una app «se cierra» cuando sales de ella al inicio o cambias a otra app. Si la cierras desde el selector de apps, o si iOS la suspende por memoria, a veces la automatización no se dispara. En ese caso usa el acceso de la pantalla de inicio.
- Sin internet, iOS muestra su propio error («La conexión a internet parece estar desactivada»). **El gasto no se pierde**: ya quedó en la cola (paso 9).
- El enlace «Abrir en la app» abre **Safari**, no la PWA instalada. En el iPhone son espacios separados, así que la primera vez tendrás que iniciar sesión también en Safari.

## 6. Pruebas de aceptación (fase 3)

| Prueba | Resultado esperado |
|---|---|
| Abrir Yape, salir | Aparece «¿En qué gastaste?»; al terminar llega la notificación «✓ S/ … · Yape» con el total del mes |
| Ver el gasto en la PWA | Hora correcta (Lima) en Movimientos |
| Abrir BCP, salir | Aparece «¿Qué hiciste en BCP?» con «Pago de tarjeta de crédito» |
| Elegir «No fue un gasto» | No se registra nada |
| Modo avión → registrar | Error de iOS. Quitar el modo avión y registrar otro: la notificación dice «+1 pendiente enviado» |

## 7. Si se filtra el token

1. Genera uno nuevo (`docs/setup.md` §4) y cárgalo con `npx supabase secrets set INGEST_TOKEN=...`.
2. Cámbialo en el encabezado `x-api-key` del paso 32, y del paso 3 de «Enviar pendientes» si lo creaste.
