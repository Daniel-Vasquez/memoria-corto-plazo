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
  store/
    useGameStore.ts    # Zustand + persist: playerName, unlockedLevelId,
                        # bestResults, completeLevel, resetProgress
  data/
    levels.ts           # genera los 40 Level (metadata: id, tier, subLevel, minWpm,
                         # minAccuracy) — ya no contiene el contenido a memorizar,
                         # eso lo genera generateRandomPattern() en tiempo real
  types/
    game.ts              # Tier, Level, LevelResult, CharState
  layouts/Layout.astro   # <head> con el script anti-FOUC de temas
  pages/index.astro      # header/footer + <MemoryGame client:load />
  pages/progreso.astro   # header/footer + <ProgressDashboard client:load />
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
  el nombre), `setPlayerName()`. Sin cambios de lógica respecto al proyecto
  original — solo cambió la key de `localStorage` (ver Gotchas/Pendiente).

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

- Los pools de caracteres, rangos de longitud y probabilidad de espacios de
  `patternGenerator.ts` (`CHAR_POOLS`, `LENGTH_RANGES`, `SPACE_PROBABILITY`)
  son valores iniciales razonables, no números validados con jugadores
  reales — puede hacer falta ajustarlos (sobre todo la longitud máxima de
  `avanzado`/`master`, 18-28 caracteres, que en fuentes grandes puede
  memorizarse muy difícil en el tiempo que da `getMemorizeDurationMs`).
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
