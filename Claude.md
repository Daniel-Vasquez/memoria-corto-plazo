# Memoria a corto plazo

Juego web de memoria a corto plazo con 40 subniveles (4 tiers × 10): se
genera un patrón de caracteres aleatorio, se muestra en pantalla durante
unos segundos, desaparece, y el jugador debe reescribirlo de memoria. Va de
patrones cortos de minúsculas hasta patrones largos con letras, números y
símbolos.

Es un pivote de un proyecto anterior de mecanografía (typing test) — la UI,
el store, los niveles y el dashboard de progreso vienen de ahí, pero la
mecánica central cambió de "escribe mientras ves el texto" a "memoriza,
luego reescribe de memoria". Si aparece código o documentación mencionando
`TypingGame`, `useTypingEngine`, o "mecanografía"/"escribir rápido", es
resto sin limpiar de esa época — la app ya no mide velocidad de copiado, mide
recuerdo.

El contenido a memorizar tampoco es texto curado: hasta una sesión posterior
al pivote, cada subnivel tenía 3 variantes de texto estáticas (fila guía,
palabras en español, fragmentos de código real HTML/JS/CSS/SQL). Se
reemplazó por `generateRandomPattern()` (`src/lib/patternGenerator.ts`), que
genera un patrón de caracteres nuevo en cada intento — ver "Generación de
patrones" más abajo. Si aparece código o documentación mencionando
`pickRandomText`, `BASICO_TEXTS`/`MEDIO_TEXTS`/`AVANZADO_TEXTS`/`MASTER_TEXTS`,
o el campo `Level.texts`, es resto sin limpiar de esa época también.

## Stack

- **Astro 5** — enrutamiento y layout, output estático.
- **React 18** vía `@astrojs/react`, montado con `client:load` en
  `MemoryGame` (necesita arrancar temporizadores y capturar `keydown` desde
  el primer render; `client:visible` no sirve aquí).
- **Tailwind CSS 3** vía `@astrojs/tailwind`, con `darkMode: 'class'`.
- **Zustand** (`zustand/middleware persist`) para estado global — progreso y
  nombre del jugador persistidos en `localStorage` bajo la key
  `memoria-corto-plazo-progress`.
- **Framer Motion** para transiciones sutiles (cambio de fase, overlays de
  resultados y modales).
- **Recharts** para el dashboard de progreso (`/progreso`) — único chart lib
  del proyecto, montada en una isla React igual que el resto.
- **Vitest** + **Testing Library** (`@testing-library/react`) para tests de
  hooks (jsdom vía `vitest.config.ts`). Cobertura hoy limitada a
  `useMemoryEngine` y `generateRandomPattern` — son las dos piezas de lógica
  pura y crítica del proyecto.
- **Web Audio API nativa** (`src/lib/keySound.ts`) para el feedback sonoro
  por pulsación durante la fase de recuerdo — sin librería externa (ni
  howler.js ni similares).
- **`@astrojs/vercel`** (fijado en `8.x`, no `latest` — la rama `11.x`
  exige Astro ≥7 y el proyecto está en Astro 5) + `output: 'server'` en
  `astro.config.mjs`, agregados en la sesión de migración a MongoDB (ver
  "Sincronización de progreso con MongoDB" más abajo). `index.astro` y
  `progreso.astro` llevan `export const prerender = true` explícito para
  seguir sirviéndose estáticas — solo `/api/progress` corre como función
  serverless.
- **Driver oficial `mongodb`** (sin ODM tipo Mongoose — el shape que se
  guarda es un objeto plano, `ProgressDocument` en `src/lib/mongodb.ts`) para
  respaldar en la nube el progreso que antes vivía solo en `localStorage`.

## Comandos

```bash
npm run dev      # astro dev, puerto 4321 por defecto
npm run build    # astro check && astro build
npx astro check  # solo diagnósticos TS
npm run lint     # eslint .
npm run format   # prettier --write .
npm run test     # vitest run
```

Hook de pre-commit (`husky` + `lint-staged`, configurado en `.lintstagedrc.json`):
corre `eslint --fix` + `prettier --write` sobre los archivos staged en cada
`git commit`. Se instala solo al correr `npm install` (script `prepare`).

Requiere `MONGODB_URI` en el entorno para que `/api/progress` funcione (ver
`.env.example`) — sin esa variable, la API devuelve 500 pero el resto de la
app sigue funcionando con `localStorage` (ver "Sincronización de progreso
con MongoDB"). En Vercel se configura por proyecto (Production/Preview/
Development); localmente, copiar `.env.example` a `.env` (ignorado por git).

## Estructura

```
src/
  components/
    MemoryGame.tsx      # componente principal: layout, estado del nivel activo,
                         # renderiza cada fase (memorizing/recalling/finished)
    Modal.tsx          # overlay genérico (backdrop + card animada)
    NameModal.tsx       # pide el nombre al primer ingreso
    ConfirmModal.tsx    # confirmación genérica (usado para reset de progreso)
    ThemeToggle.tsx      # selector de 2 posiciones (Claro/Oscuro), en el header
    ProgressDashboard.tsx # dashboard de /progreso: stats + gráfica Recharts de WPM por nivel
  hooks/
    useMemoryEngine.ts      # máquina de estados de 3 fases (memorizing/recalling/finished),
                             # temporizador de memorización y comparación typed vs target
    useMemoryEngine.test.ts # tests (Vitest + Testing Library) de las transiciones de fase
                             # y del cálculo de precisión/errores/WPM
  lib/
    theme.ts             # tipo Theme + read/apply/persist en localStorage,
                          # compartido por ThemeToggle y (duplicado, ver abajo) el script anti-FOUC
    cn.ts                 # helper de clases condicionales (join de strings), sin dependencia externa
    keySound.ts            # feedback sonoro (Web Audio API) durante la fase de recuerdo
    fontSize.ts            # tipo FontSize + read/persist en localStorage
    patternGenerator.ts       # generateRandomPattern(tier, subLevel): pool de caracteres
                               # y longitud escalan con la dificultad
    patternGenerator.test.ts  # tests de pools/longitud/espacios por tier
    mongodb.ts                # getProgressCollection(): singleton de conexión (server-only,
                               # usa MONGODB_URI) + tipo ProgressDocument
    progressSync.ts            # client-side: pullProgress/pushProgress/mergeProgress/
                                # syncProgressOnLoad — ver "Sincronización de progreso con MongoDB"
    progressSync.test.ts       # tests de mergeProgress (única función pura del módulo)
  store/
    useGameStore.ts    # Zustand + persist: playerName, unlockedLevelId,
                        # bestResults, completeLevel, resetProgress, applyProgress
  data/
    levels.ts           # genera los 40 Level (metadata: id, tier, subLevel, minWpm,
                         # minAccuracy) — ya no contiene el contenido a memorizar,
                         # eso lo genera generateRandomPattern() en tiempo real
  types/
    game.ts              # Tier, Level, LevelResult, CharState, ProgressSnapshot
  layouts/Layout.astro   # <head> con el script anti-FOUC de temas
  pages/index.astro      # header/footer + <MemoryGame client:load />; prerender = true
  pages/progreso.astro   # header/footer + <ProgressDashboard client:load />; prerender = true
  pages/api/progress.ts  # GET/POST del snapshot de progreso en Mongo, único endpoint dinámico
                          # del sitio (el resto se sigue sirviendo estático, ver Stack)
  styles/global.css
```

## Modelo de datos

- `Level`: `{ id, tier, subLevel, title, instructions, minWpm, minAccuracy }`.
  Ya no tiene un campo `texts[]` — el contenido a memorizar se genera en
  tiempo real con `generateRandomPattern(level.tier, level.subLevel)` (ver
  "Generación de patrones" abajo), no se guarda en `Level`.
- `LevelResult`: `{ levelId, wpm, accuracy, errors, durationMs, passed }` — el
  shape no cambió (así el dashboard de `/progreso` sigue funcionando sin
  tocarlo), pero el significado de cada campo se recalculó para la nueva
  mecánica (ver "Condición de victoria" abajo).
- `GameState` (store): `playerName`, `unlockedLevelId` (1-40), `bestResults`
  (`Record<levelId, LevelResult>`, se sobreescribe solo si el nuevo WPM es
  mayor), `completeLevel()`, `resetProgress()` (limpia nivel/resultados, NO
  el nombre), `setPlayerName()`, `applyProgress()` (setter directo usado solo
  por la sincronización con Mongo, ver abajo — no recalcula "isNewBest"
  porque el snapshot que recibe ya viene mezclado por `mergeProgress()`).
  Sin cambios de lógica respecto al proyecto original — solo cambió la key
  de `localStorage` (ver Gotchas/Pendiente).
- `ProgressSnapshot` (`types/game.ts`): `{ playerName, unlockedLevelId,
  bestResults }` — el subconjunto de `GameState` que viaja hacia/desde
  `/api/progress`. No incluye `activeLevelId`: es una preferencia de UI por
  dispositivo ("qué nivel tenía abierto"), no progreso que tenga sentido
  sincronizar. `playerName` sí se sincroniza (agregado en una sesión
  posterior a la migración inicial — ver "Sincronización de progreso con
  MongoDB") aunque es un texto libre sin verificar, igual que siempre fue en
  `NameModal`: no hay ninguna garantía de que identifique a una persona
  real, es solo lo que el jugador tipeó.

## La mecánica: máquina de estados de 3 fases (`useMemoryEngine`)

`useMemoryEngine(target, onFinish, enabled)` expone `phase: 'idle' |
'memorizing' | 'recalling' | 'finished'` y controla las transiciones:

1. **`idle`**: nivel seleccionado, nada visible todavía. `start()` se
   dispara al hacer click en el contenedor, en el botón "Memorizar", o al
   pulsar cualquier tecla (igual que el motor de mecanografía anterior
   dejaba arrancar el cronómetro con la primera pulsación) — siempre que
   `enabled` sea `true`.
2. **`memorizing`**: se muestra `target` en pantalla (texto plano, sin
   colorear) durante `memorizeDurationMs` (calculado por
   `getMemorizeDurationMs`, ver abajo). El input está deshabilitado. Al
   vencer el timeout, el hook pasa solo a `recalling`.
3. **`recalling`**: el texto desaparece. Se habilita un `<textarea>` visible
   y controlado (`typed`/`updateTyped`) donde el jugador escribe lo que
   recuerda. `Enter` o el botón "Comprobar" llaman a `submit()`.
4. **`finished`**: `submit()` compara `typed` contra `target` una sola vez
   (no por pulsación, a diferencia del motor de mecanografía original,
   porque mientras se escribe no hay nada visible contra qué comparar) y
   entrega `{ wpm, accuracy, elapsedMs }` + `errorCount` vía `onFinish`.
   `charStates` queda disponible para pintar el diff typed/target en el
   `ResultsOverlay`.

Cambiar `target` (nuevo subnivel o reintento) resetea el hook a `idle`,
igual que el motor anterior reseteaba al cambiar de texto.

### Generación de patrones (`generateRandomPattern`)

`src/lib/patternGenerator.ts` reemplazó las cadenas estáticas curadas
(`BASICO_TEXTS`, fragmentos de código, etc.) por `generateRandomPattern(tier,
subLevel)`, que arma un patrón carácter a carácter:

- **Pool de caracteres por tier** (`CHAR_POOLS`): `basico` = solo minúsculas;
  `medio` = minúsculas + mayúsculas + dígitos; `avanzado`/`master` = eso más
  símbolos (`!@#$%^&*()-_=+[]{};:,.<>/?`).
- **Longitud por tier** (`LENGTH_RANGES`): un rango `[min, max]` que se
  interpola linealmente entre subnivel 1 y 10 — mismo patrón matemático que
  `minWpm`/`minAccuracy` en `buildTier()` (`data/levels.ts`). `basico` va de
  4 a 6 caracteres; el resto de tiers escala más arriba (`medio` 7-12,
  `avanzado` 12-18, `master` 18-28).
- **Espacios** (`SPACE_PROBABILITY`): probabilidad de insertar un espacio
  entre caracteres para simular saltos de "palabra" — pero **`basico` se
  mantiene en 0** a propósito. Una petición explícita de una sesión anterior
  fijó ese tier en patrones cortos y sin espacios (para que memorizar una
  sola palabra corta, no una frase, sea la unidad de práctica); esta función
  respeta esa decisión en vez de aplicarle la probabilidad general del resto
  de tiers. Cuando se genera un espacio, nunca es el primer ni el último
  carácter, ni se genera dos veces seguidas.
- Devuelve un `string` plano — el resto del juego (`MemoryGame.tsx`,
  `useMemoryEngine`, `DiffView`) no distingue entre un patrón generado y una
  cadena estática, así que no necesitaron cambios más allá de dónde se llama
  a la función generadora.

### Tiempo de memorización dinámico

`getMemorizeDurationMs(target)` en `useMemoryEngine.ts`:
`clamp(3000, 9000, 2200 + target.length * 90)`. Crece con la longitud del
patrón (los patrones largos del tier Master consiguen más tiempo que los
cortos del tier Básico) pero se mantiene siempre en el rango ~3-9 segundos
pedido — nunca instantáneo, nunca interminable. Como la longitud ahora la
decide `generateRandomPattern()` (ver arriba) en vez de un texto curado a
mano, el tiempo de memorización sigue escalando con la dificultad sin
necesitar ningún cambio en esta función.

### Condición de victoria

Igual que el motor de mecanografía original: `passed = wpm >= level.minWpm
&& accuracy >= level.minAccuracy`. No es una coincidencia exacta al 100% —
hay margen de error definido por tier (`minAccuracy` sube de 85% en Básico a
97% en Master, ver `buildTier()` en `data/levels.ts`).

- `accuracy`: se compara `typed` contra `target` carácter a carácter por
  posición; el denominador es `target.length` (no la longitud de lo
  escrito), así que un texto reescrito más corto que el original nunca
  puede dar 100% de precisión aunque los caracteres presentes sean
  correctos.
- `errors`: cuenta cada posición que no coincide, incluyendo caracteres de
  más (typed más largo que target) y de menos (typed más corto) — ambos
  casos son "errores" aunque no aporten a la misma fórmula de `accuracy`.
- `wpm`: se mide sobre la duración de la fase `recalling` (desde que el
  texto desaparece hasta `submit()`), con la misma fórmula de
  palabras=longitud/5 que usaba el motor de mecanografía. Ya no representa
  "velocidad de copiado" sino "velocidad para volcar lo que recordaste".
  El cronómetro arranca apenas el texto desaparece, no en la primera
  pulsación — así que el tiempo que el jugador tarda en *recordar* antes de
  escribir la primera letra también cuenta contra su WPM.
- **`minWpm` de `buildTier()` (`data/levels.ts`) se recalibró a la baja el
  2026-08-25** tras un reporte real: en Medio 1 un intento con `Ln 8SrD`
  (precisión 100%, 0 errores, texto idéntico al original) dio WPM 8 y no
  superaba el nivel porque el umbral original era `minWpm: 20`. Los rangos
  originales (heredados tal cual del motor de mecanografía, donde WPM medía
  velocidad de copiado sin tope práctico) no tenían en cuenta que acá el
  WPM está acotado por el tiempo de *recordar*, que crece poco con la
  longitud del patrón — a diferencia de escribir mientras se ve el texto,
  donde un jugador más hábil sí escala su WPM. Rangos nuevos:
  Básico 5-8, Medio 6-10, Avanzado 7-12, Master 8-15 (antes 10-20, 20-30,
  30-40, 40-60 respectivamente). Igual que el resto de valores de
  dificultad del proyecto, son una estimación razonada, no un número
  validado con varios jugadores (ver Pendiente).

## Sincronización de progreso con MongoDB

Antes de esta sesión el progreso vivía únicamente en `localStorage`
(`memoria-corto-plazo-progress`, ver arriba) — sin backend, sin build
server-side. Se agregó MongoDB como respaldo en la nube sin tocar esa base:
`localStorage` sigue siendo la fuente de verdad inmediata para la UI (todos
los patrones de hidratación de `MemoryGame.tsx` — `activeLevel`/`fontSize`/
`memorizeSpeed` arrancando en `useState` local o `null` y sincronizándose en
el efecto client-only — siguen intactos), y Mongo es una capa de
sincronización en segundo plano que nunca bloquea ni rompe una partida si
falla.

- **Identidad: UUID anónimo en cookie, no cuenta real**. `player_id`
  (httpOnly, `secure` en producción, `sameSite: 'lax'`, 2 años) se genera
  con `randomUUID()` la primera vez que el navegador pega contra
  `/api/progress` (`getOrCreatePlayerId()` en `src/pages/api/progress.ts`).
  No hay login ni verificación — es el mismo modelo de confianza que ya
  tenía `playerName` (un texto libre sin autenticar), solo que ahora
  identifica un documento en Mongo en vez de nada. Decisión explícita:
  cross-device requeriría un sistema de cuentas real, que se descartó por
  ahora a favor de fricción cero (ver Pendiente).
  - **Caveat de dominio**: el sitio se sirve en el dominio de Vercel y en
    `memoria.danielvasquez.lat`; la cookie `player_id` es específica de
    dominio, así que un jugador que entra por ambos ve progreso
    desincronizado entre uno y otro (dos IDs distintos). No hay redirect
    de un dominio a otro implementado — si hace falta un solo dominio
    canónico, es una decisión de Vercel (redirect a nivel de proyecto), no
    de este código.
- **`src/pages/api/progress.ts`** — único endpoint, sin `prerender` (server
  route real):
  - `GET`: asegura la cookie (la crea si falta) y devuelve el
    `ProgressSnapshot` guardado en Mongo para ese `player_id`, o
    `{ unlockedLevelId: 1, bestResults: {} }` si todavía no existe
    documento.
  - `POST`: valida el body a mano (`isValidSnapshot`/`isValidLevelResult` —
    boundary de entrada externa, por eso sí hay validación aquí a
    diferencia del resto del código interno del proyecto) y hace
    `updateOne` con `upsert: true`. Última escritura gana — no hay merge
    server-side porque es progreso de un solo jugador por id, sin edición
    concurrente real esperada.
- **`src/lib/mongodb.ts`** — conexión cacheada en una variable de módulo
  (`clientPromise`), no reconectada en cada invocación: necesario en
  serverless de Vercel, donde una misma instancia de función puede atender
  varias requests (warm start) y reabrir conexión cada vez agotaría el pool
  de Atlas. `ProgressDocument` tipa `_id` como `string` (el UUID de la
  cookie) en vez del `ObjectId` que asume por defecto el driver — sin esto,
  `collection.findOne({ _id: playerId })` no tipa (ver `getProgressCollection()`).
- **`src/lib/progressSync.ts`** (client-side, sin dependencia del store —
  ver por qué abajo):
  - `mergeProgress(local, remote)`: pura, sin I/O — por eso es la única
    pieza de este módulo con test (`progressSync.test.ts`, mismo criterio
    que ya aplicaba `patternGenerator.test.ts`). Misma regla que
    `completeLevel` en `useGameStore.ts` para decidir qué `bestResult` gana
    por nivel (mayor `wpm`), y `Math.max` para `unlockedLevelId`.
    `playerName` no tiene un "mejor" comparable como `wpm`, así que prefiere
    el local (`local.playerName ?? remote.playerName`) y solo cae al remoto
    si el local todavía no se seteó.
  - `pushProgress(snapshot)`: `POST` fire-and-forget envuelto en
    `try/catch` silencioso — sin red o con Mongo caído, no revienta ninguna
    acción del jugador, solo se pierde ese respaldo puntual (se reintenta
    en la próxima mutación o carga de página).
  - `syncProgressOnLoad(local, applyMerged)`: se llama una única vez, desde
    el mismo efecto client-only de `MemoryGame.tsx` que ya sincronizaba
    `fontSize`/`memorizeSpeed`/`activeLevel` (línea ~502). Trae el snapshot
    remoto, lo mezcla con `mergeProgress`, aplica el resultado al store
    solo si cambió algo local (`applyMerged`, que es
    `useGameStore.getState().applyProgress`), y sube el merge de vuelta si
    el servidor quedó desactualizado. Este último paso es lo que migra sin
    ningún script aparte el progreso que ya vivía en `localStorage` antes
    del deploy: la primera vez que corre tras el deploy, Mongo no tiene
    nada para ese `player_id` nuevo, `mergeProgress` devuelve el snapshot
    local tal cual, y como difiere del remoto (vacío) se sube solo.
  - **Por qué `progressSync.ts` no importa `useGameStore`**: evitar una
    dependencia circular con `useGameStore.ts` (que sí importa
    `pushProgress` de acá, para llamarlo desde `completeLevel`/
    `resetProgress`). En vez de que este módulo lea el store directamente,
    `syncProgressOnLoad` recibe el snapshot local y el setter como
    parámetros — los pasa `MemoryGame.tsx`, que ya tiene acceso al store.
    Efecto colateral bueno: `mergeProgress`/`pushProgress`/`pullProgress`
    quedan testeables sin mockear Zustand.
- **Qué dispara un `push`**: `completeLevel`, `resetProgress` y
  `setPlayerName` en `useGameStore.ts` — las tres acciones que cambian algún
  campo de `ProgressSnapshot`. `setActiveLevelId` NO dispara sync porque
  `activeLevelId` no forma parte del snapshot (ver Modelo de datos, arriba).
  `applyProgress()` (usado solo al sincronizar al cargar) adopta el
  `playerName` remoto únicamente si el local todavía es `null` — así no
  pisa lo que el jugador ya tipeó en este navegador, pero sí lo restaura si
  `localStorage` se borró y la cookie `player_id` sigue viva.
- **`output: 'server'` + `@astrojs/vercel` en vez de mantener el sitio
  100% estático**: imprescindible para que `/api/progress` corra
  server-side (el driver de `mongodb` no puede ejecutarse en el bundle del
  cliente). `index.astro` y `progreso.astro` llevan
  `export const prerender = true` explícito para que Astro las siga
  sirviendo estáticas de todos modos — ninguna de las dos depende de datos
  de request, así que no había motivo para perder ese rendimiento solo por
  agregar un endpoint.

## Decisiones de diseño (por qué está así)

- **`generateRandomPattern()` se llama solo en `useState(() => ...)` (carga
  inicial) y dentro de `selectLevel`/`retry` en `MemoryGame.tsx`** — nunca en
  el cuerpo del componente ni en un `useMemo` disparado por cambios de fase.
  `target` es un `useState` plano que solo cambia por esas dos vías
  imperativas, así que el patrón generado se mantiene estable durante todo
  el intento (memorizing → recalling → finished); `useMemoryEngine` solo
  resetea sus fases cuando `target` cambia (por eso nunca regenera el patrón
  por su cuenta), y no puede regenerarlo mientras el jugador escribe o
  valida porque no tiene ninguna referencia a `generateRandomPattern`.
- **El textarea de `recalling` se enfoca solo con el atributo `autoFocus`,
  no con un `useEffect` keyed en `[phase]`**: la primera versión usaba
  `useEffect(() => { if (phase === 'recalling') inputRef.current?.focus();
  }, [phase])`, pero nunca funcionaba — el `motion.div` que envuelve cada
  fase usa `<AnimatePresence mode="wait">`, así que cuando `phase` pasa a
  `'recalling'` el textarea todavía no existe en el DOM: `mode="wait"`
  primero corre la animación de salida de la fase anterior (~200ms) y solo
  después monta el nuevo `motion.div`. El efecto se disparaba en el mismo
  tick que cambiaba `phase`, antes de ese montaje, así que `inputRef.current`
  era `null` y el jugador tenía que hacer click a mano en el textarea para
  poder escribir. `autoFocus={phase === 'recalling'}` no tiene ese problema
  porque se dispara en el momento real en que el nodo se monta, sin importar
  cuánto se demore `AnimatePresence`. `inputRef` se mantiene para el caso de
  `handleContainerClick` (click manual en el contenedor mientras ya se está
  en `recalling`, para reenfocar si el jugador perdió el foco).
- **`MemorizeText` bloquea copiar el patrón, y el textarea de `recalling`
  bloquea pegar** (`MemoryGame.tsx`): `onCopy={(e) => e.preventDefault()}` +
  `select-none` en el `<p>` que muestra el patrón durante `memorizing`, y
  `onPaste={(e) => e.preventDefault()}` en el `<textarea>` de `recalling`.
  No es una protección infalible (devtools sigue pudiendo leer el DOM), pero
  cubre el camino obvio de "seleccionar y copiar" o "pegar lo que copié
  antes" — hacer trampa así rompería el sentido del ejercicio de memoria.
- **El input de la fase `recalling` es un `<textarea>` visible y
  controlado, no un input invisible con captura de `keydown` en `window`**:
  el motor de mecanografía anterior usaba un `<input>` `sr-only` y escuchaba
  `keydown` en `window` para poder colorear cada carácter en tiempo real
  contra el texto (visible) mientras se escribía. Acá el texto está oculto
  durante toda la fase de escritura — no hay nada que colorear en vivo, así
  que un `<textarea>` controlado por `onChange` es más simple y ya es
  accesible por defecto (sin necesitar el truco `sr-only` + región
  `aria-live` que sí seguía haciendo falta para anunciar fase/resultado).
- **`useMemoryEngine(target, onFinish, enabled)`**: el tercer parámetro
  `enabled` se mantiene por la misma razón que en el motor anterior — con
  cualquier modal abierto (`NameModal`, `ConfirmModal` de reset) no debe
  poder arrancarse la memorización ni escribirse en el textarea.
  `engineEnabled = Boolean(playerName) && !showResetConfirm` en
  `MemoryGame.tsx`.
- **La comparación ocurre una sola vez en `submit()`, no por pulsación**: es
  la diferencia estructural más grande contra el motor de mecanografía
  original (que evaluaba cada `keydown` contra el texto visible). Acá,
  mientras se escribe en `recalling` no hay nada visible contra qué
  comparar — compararlo en vivo no tendría sentido ni se podría mostrar sin
  arruinar el ejercicio. `charStates` (el diff typed/target) solo se calcula
  cuando `phase === 'finished'`.
- **La barra de progreso bajo el header cambia de significado según la
  fase**: durante `memorizing` muestra tiempo restante para memorizar
  (`memorizeMsLeft / memorizeDurationMs`, en ámbar); durante
  `recalling`/`finished` vuelve a representar avance de escritura
  (`typed.length / target.length`, en teal) — mismo patrón visual que el
  progreso de escritura del motor anterior, reutilizado para la cuenta
  regresiva.
- **`ResultsOverlay` incluye un `DiffView`** (`MemoryGame.tsx`) que muestra
  dos líneas: "Lo que escribiste" (coloreado correcto/incorrecto por
  posición, reutilizando el mismo esquema de color verde/rojo que el motor
  de mecanografía usaba en vivo) y "Texto original" (sin colorear, con una
  nota si sobraron caracteres por escribir). Es la única vez que el jugador
  ve la comparación — antes de `finished` nunca se revela si lo escrito es
  correcto.
- **`CharState` se redujo a `'correct' | 'incorrect'`** (`types/game.ts`):
  el motor de mecanografía original tenía además `'pending'` y `'current'`
  porque coloreaba el texto carácter por carácter mientras se escribía. Acá
  el diff solo se calcula una vez al final, así que esos dos estados ya no
  tienen sentido y se eliminaron en vez de dejarlos sin usar.
- **Pills de WPM/Precisión muestran `bestResults[activeLevel.id]` (mejor
  marca histórica) hasta que hay un `lastResult` de este intento**: no hay
  "stats en vivo" que mostrar durante `memorizing`/`recalling` (a diferencia
  del motor anterior, que sí tenía WPM/precisión creciendo en tiempo real
  mientras se escribía), así que la condición se simplificó a
  `lastResult ? ... : bestResult`, sin necesitar distinguir `idle` de
  `running` como antes.
- **La key de `localStorage` cambió de `mecanografia-progress` a
  `memoria-corto-plazo-progress`**: es un pivote de mecánica, no un ajuste
  — el WPM/precisión de un test de mecanografía y los de este juego de
  memoria miden cosas distintas aunque compartan nombre de campo. Usar la
  key vieja habría mezclado datos de dos juegos diferentes bajo la mismo
  progreso. Efecto práctico: cualquier progreso guardado del proyecto de
  mecanografía anterior no se migra ni se lee — arranca de cero.
- **`resetProgress()` no borra `playerName`**: reiniciar progreso vuelve a
  nivel 1 y borra `bestResults`, pero no vuelve a pedir el nombre (son
  conceptos separados en el store). Decisión heredada del proyecto original,
  sin cambios.
- **Modal de confirmación reutilizable** (`ConfirmModal.tsx`): genérico por
  diseño (title/message/confirmLabel/cancelLabel/onConfirm/onCancel) porque
  ya se usa para el reset de progreso y es el patrón natural para cualquier
  acción destructiva futura.
- **Sistema de temas (Claro / Oscuro)**: una sola clase en `<html>` — sin
  clase (Claro) o `.dark` (Oscuro). `tailwind.config.mjs` define
  `darkMode: 'class'`; no hay plugins propios. Persistencia en
  `localStorage['theme-preference']` (`'light' | 'dark'`). Sin cambios
  respecto al proyecto original.
  - **Script anti-FOUC** en `Layout.astro`, primera etiqueta dentro de
    `<head>` (`<script is:inline>`): lee `theme-preference` y aplica la
    clase a `<html>` antes del primer paint. Está duplicado a propósito en
    `src/lib/theme.ts` (`readStoredTheme`/`applyTheme`/`persistTheme`) — el
    script del `<head>` no puede importar ese módulo porque debe ser
    síncrono/bloqueante, así que si cambia la key o los valores del tema hay
    que actualizar ambos lugares.
  - **`ThemeToggle.tsx` arranca con `theme = null`, no con
    `readStoredTheme()` en el `useState` inicial**: Astro pre-renderiza el
    componente en el servidor (sin `localStorage`), por lo que ese HTML
    estático siempre asume `'light'`. Leer `localStorage` directamente en el
    inicializador de `useState` provocaba un hydration mismatch. La
    solución: arrancar en `null` (ningún botón activo, igual que el
    servidor) y sincronizar el valor real de `localStorage` en un
    `useEffect` que solo corre en el cliente — mismo patrón que usan
    librerías como `next-themes` para este problema. `MemoryGame.tsx` usa el
    mismo patrón para `fontSize`, y `ProgressDashboard.tsx` para
    `useIsDarkSurface()`.
- **Dashboard de progreso (`/progreso`, `ProgressDashboard.tsx`) no se tocó
  al pivotar la mecánica**: no crea ninguna fuente de datos nueva — lee
  directamente `bestResults` y `unlockedLevelId` de `useGameStore` y cruza
  con `LEVELS` de `data/levels.ts`. Como el shape de `LevelResult` no
  cambió, la gráfica sigue funcionando sin ninguna modificación; solo el
  *significado* de "WPM" pasó de "velocidad de copiado" a "velocidad de
  recuerdo".
  - Gráfica `ComposedChart` (Recharts, Area + Line) con WPM en el eje Y y los
    40 niveles en el eje X; los niveles aún no intentados quedan como `null`
    en el dataset (`connectNulls={false}`), así el trazo muestra huecos en
    vez de interpolar hacia niveles no jugados.
    Colores fijos (no dependen de light/dark), elegidos y validados con la
    skill `dataviz` (`scripts/validate_palette.js`): línea/área en
    `#0284c7` (sky-600, el acento del proyecto), y los puntos en el par de
    estado `#0ca30c`/`#d03b3b` (superado/no superado). Ese par de estado no
    separa bien en daltonismo deuteranopo por color solo (ΔE ~4, por debajo
    del piso de 15), así que además se diferencia por **forma**: círculo
    (superado) vs. rombo (no superado). Un toggle "Ver como tabla" da una
    alternativa 100% accesible al gráfico.
  - `useIsDarkSurface()` (hook local al componente): arranca en `false` y
    sincroniza vía `MutationObserver` sobre la clase de `<html>`, mismo
    patrón que `ThemeToggle` para evitar el hydration mismatch — necesario
    porque Recharts pinta en SVG y ahí las clases `dark:` de Tailwind no
    aplican; el grid, los ejes y el aro de los puntos necesitan color
    explícito en JS. El tooltip sí es HTML normal, así que ese usa clases
    `dark:` como el resto de la UI.
  - Sombreado de fondo (`ReferenceArea`) por tier a opacidad muy baja (6%)
    solo da contexto cronológico; no compite como color identitario, por eso
    no pasó por la validación de paleta categórica.
- **`MemoryGame` usa un `<textarea>` real (visible) en vez de un `<div
  tabIndex>` o un input `sr-only`**: como se explicó arriba, ya no hace
  falta el truco `sr-only` porque no hay nada que colorear en vivo. El
  contenedor sigue usando `focus-within:ring-2` en vez de `focus:ring-2`
  porque el foco vive en el `<textarea>` hijo, no en el propio `div`.
  También hay una región `aria-live="polite"` (`sr-only`) que anuncia el
  cambio de fase ("Memoriza el texto en pantalla" / "Escribe de memoria lo
  que acabas de ver") y el resultado del intento, para quien no puede ver el
  `ResultsOverlay` ni el texto que desaparece.
- **`Layout.astro` acepta una prop `description`** (con default) que alimenta
  `meta description`, Open Graph y Twitter Card. No se añadió sitemap
  (`@astrojs/sitemap`) todavía: esa integración necesita `site` configurado
  en `astro.config.mjs`, y hoy no hay un dominio de producción definido.
- **`cn()` propio en `src/lib/cn.ts` en vez de `clsx`**: reemplaza los
  `[...].join(' ')` de clases condicionales (ej. botones de
  `LevelSelector`). Se implementó a mano porque es una utilidad de una línea
  y el resto del stack no tenía dependencias nuevas que justificar solo por
  esto — si el proyecto adopta `clsx`/`tailwind-merge` más adelante, este
  helper se puede reemplazar por un re-export.
- **ESLint (flat config) + Prettier**: `eslint.config.js` combina
  `eslint-plugin-astro`, `typescript-eslint` y `eslint-plugin-react`(-hooks).
  Versiones fijadas a propósito, no "latest": `eslint-plugin-astro@1.7.0`
  (las versiones 2.x/3.x exigen ESLint ≥10, y el proyecto usa ESLint 9 por
  compatibilidad con `eslint-plugin-react`) y
  `eslint-plugin-react-hooks@5.2.0` (la rama 6.x/7.x añade reglas
  experimentales pensadas para React Compiler, como `react-hooks/refs`, que
  marcarían como error patrones de lectura de `ref.current` dentro de
  `useMemo`/`useCallback` — válidos en React 18 sin Compiler, pero no en ese
  preset).
- **`playKeySound()` se llama dentro de `updateTyped`, en `useMemoryEngine.ts`,
  cada vez que el texto escrito crece**: sigue siendo un no-op seguro en
  SSR/tests (`getAudioContext()` devuelve `null` si `window.AudioContext` no
  existe), por eso los tests de Vitest no necesitan mockearlo. A diferencia
  del motor de mecanografía original, ya no se le pasa si el carácter fue
  "correcto" o no (`playKeySound(true)` siempre) porque durante `recalling`
  no hay texto visible contra qué comparar en el momento de tipear — el
  sonido es solo feedback táctil de que la tecla registró, no de acierto.
- **Confetti en `ResultsOverlay` respeta `prefers-reduced-motion`**: usa
  `useReducedMotion()` de Framer Motion y no renderiza nada si el usuario lo
  tiene activado, en vez de solo bajar la duración de la animación.
- **Vitest necesita `@types/node`** aunque el resto del proyecto no lo usa:
  `vitest.config.ts` importa `node:path` y usa `__dirname` para resolver el
  alias `@`, y `astro check` (que corre `tsc` sobre `**/*` del repo) fallaba
  sin esos tipos.

## Gotchas conocidos

- **`npm install @astrojs/vercel` sin fijar versión instala la rama `11.x`,
  que exige `astro@^7` y rompe con `ERESOLVE`** — el proyecto está en Astro
  5.2.5. Hay que instalar `@astrojs/vercel@8` explícitamente (peer
  `astro@^5.0.0`).
- **No hay forma de probar `/api/progress` en local sin una `MONGODB_URI`
  real** (no hay Mongo local ni Docker en este entorno, y el proyecto no
  tiene un mock/in-memory Mongo configurado) — se verificó la validación de
  input (400 ante body inválido) y que el resto del sitio sigue
  respondiendo 200 aunque la API devuelva 500 sin esa variable, pero el
  camino feliz completo (GET/POST contra un Mongo real, cookie
  persistiendo entre requests) no se probó end-to-end todavía.
- La extensión de automatización de Chrome (Claude in Chrome) **bloquea por
  política el acceso a `localhost`/`127.0.0.1`** — da
  `Error capturing screenshot: Frame with ID 0 is showing error page` aunque
  el servidor responda bien (verificado con `curl`). Para verificar cambios
  de UI visualmente hay que probar manualmente en el navegador o exponer el
  dev server con un túnel; no sirve pedirle captura a la extensión sobre
  `localhost`.
- `node_modules/`, `dist/` y `.astro/` están en `.gitignore` pero **ya
  estaban comiteados** desde antes de añadirlo — hubo que
  `git rm -r --cached node_modules dist .astro` para destrackearlos (sin
  borrarlos del disco). `.gitignore` por sí solo nunca deja de rastrear
  archivos que ya estaban en el índice, solo evita que se añadan nuevos.

## Pendiente / ideas no implementadas

- **No probado end-to-end contra un MongoDB real** (ver Gotchas) — falta
  configurar `MONGODB_URI` en Vercel (o vía la integración oficial de
  MongoDB Atlas en el marketplace de Vercel, que además configura el
  acceso de red del cluster automáticamente) y hacer una pasada manual
  post-deploy: cargar la app con progreso viejo en `localStorage`,
  confirmar que sube a Mongo, borrar `localStorage` y confirmar que se
  restaura desde el servidor.
- El progreso no sincroniza entre el dominio de Vercel y
  `memoria.danielvasquez.lat` (cookie por dominio, ver "Sincronización de
  progreso con MongoDB") — si en algún momento hace falta un solo dominio
  canónico, hay que decidir un redirect a nivel de proyecto en Vercel.
- Identidad 100% anónima por cookie (ver "Sincronización de progreso con
  MongoDB") — un jugador que borra cookies o cambia de navegador pierde el
  vínculo con su progreso en Mongo (sigue teniendo el de `localStorage` en
  el navegador viejo, pero no se re-vincula solo). Pasar a cuentas reales
  (email/OAuth) resolvería esto pero fue explícitamente descartado por
  ahora a favor de fricción cero.

- Los pools de caracteres, rangos de longitud y probabilidad de espacios de
  `patternGenerator.ts` (`CHAR_POOLS`, `LENGTH_RANGES`, `SPACE_PROBABILITY`)
  son valores iniciales razonables, no números validados con jugadores
  reales — puede hacer falta ajustarlos (sobre todo la longitud máxima de
  `avanzado`/`master`, 18-28 caracteres, que en fuentes grandes puede
  memorizarse muy difícil en el tiempo que da `getMemorizeDurationMs`).
- Los `minWpm` recalibrados en `data/levels.ts` (ver "Condición de
  victoria") tampoco están validados con varios jugadores — solo con el
  caso puntual que los motivó (Medio 1). Puede hacer falta otro ajuste tras
  más partidas, sobre todo en `avanzado`/`master`, donde no hay todavía
  ningún reporte real de qué WPM es alcanzable con patrones de 12-28
  caracteres.
- Los patrones aleatorios no son pronunciables ni tienen significado (a
  diferencia de las palabras/código curados que reemplazaron) — no se evaluó
  si eso afecta la experiencia para lectores de pantalla más allá del
  `aria-live` que ya anuncia fase/resultado.
- No se decidió si `resetProgress()` debería tener una variante que también
  borre `playerName` (por ahora, no lo hace).
- Sitemap (`@astrojs/sitemap`) sin añadir: falta definir `site` en
  `astro.config.mjs` con el dominio real de producción antes de que valga la
  pena instalarlo.
- `npm run format` no se ha corrido sobre todo el repo, solo sobre los
  archivos tocados en las sesiones que fueron introduciendo tooling y
  features — falta un commit dedicado solo a formateo para no mezclarlo con
  cambios funcionales.
- Analítica de producto (Plausible/Umami) sin añadir — pendiente a propósito,
  implica elegir y desplegar un servicio externo.
- `useMemoryEngine.test.ts` cubre las transiciones de fase y el cálculo de
  precisión/errores/WPM; no hay tests de componentes (`MemoryGame`,
  `ProgressDashboard`) ni end-to-end.
- No se probó visualmente en navegador el flujo completo de las 3 fases
  (memorizing → recalling → finished) por la limitación de la extensión de
  Chrome con `localhost` (ver Gotchas) — se verificó con `astro check`,
  `eslint`, `vitest` y un `curl` a ambas rutas (200 OK, HTML servido
  correctamente), pero falta una pasada manual en el navegador antes de
  darlo por completamente probado.
