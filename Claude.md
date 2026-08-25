# Mecanografía

Juego web de mecanografía con 40 subniveles (4 tiers × 10) que va de la fila
guía (ASDF JKL;) hasta fragmentos de código real (HTML/JS/CSS/SQL).

## Stack

- **Astro 5** — enrutamiento y layout, output estático.
- **React 18** vía `@astrojs/react`, montado con `client:load` en `TypingGame`
  (necesita capturar `keydown` desde el primer render; `client:visible` no
  sirve aquí).
- **Tailwind CSS 3** vía `@astrojs/tailwind`, con `darkMode: 'class'`.
- **Zustand** (`zustand/middleware persist`) para estado global — progreso y
  nombre del jugador persistidos en `localStorage` bajo la key
  `mecanografia-progress`.
- **Framer Motion** para transiciones sutiles (cambio de texto, overlays de
  resultados y modales).
- **Recharts** para el dashboard de progreso (`/progreso`) — único chart lib
  del proyecto, montada en una isla React igual que el resto.
- **Vitest** + **Testing Library** (`@testing-library/react`) para tests de
  hooks (jsdom vía `vitest.config.ts`). Cobertura hoy limitada a
  `useTypingEngine` — es la única pieza de lógica pura y crítica del
  proyecto.
- **Web Audio API nativa** (`src/lib/keySound.ts`) para el feedback sonoro
  por pulsación — sin librería externa (ni howler.js ni similares).

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
    TypingGame.tsx    # componente principal: layout, estado del nivel activo
    Modal.tsx          # overlay genérico (backdrop + card animada)
    NameModal.tsx       # pide el nombre al primer ingreso
    ConfirmModal.tsx    # confirmación genérica (usado para reset de progreso)
    ThemeToggle.tsx      # selector de 2 posiciones (Claro/Oscuro), en el header
    ProgressDashboard.tsx # dashboard de /progreso: stats + gráfica Recharts de WPM por nivel
  hooks/
    useTypingEngine.ts      # captura keydown, calcula WPM/precisión, char states
    useTypingEngine.test.ts # tests (Vitest + Testing Library) del cálculo de WPM/precisión
  lib/
    theme.ts             # tipo Theme + read/apply/persist en localStorage,
                          # compartido por ThemeToggle y (duplicado, ver abajo) el script anti-FOUC
    cn.ts                 # helper de clases condicionales (join de strings), sin dependencia externa
    keySound.ts            # feedback sonoro (Web Audio API) por tecla correcta/incorrecta
  store/
    useGameStore.ts    # Zustand + persist: playerName, unlockedLevelId,
                        # bestResults, completeLevel, resetProgress
  data/
    levels.ts           # genera los 40 Level a partir de pools de texto por tier
  types/
    game.ts              # Tier, Level, LevelResult, CharState
  layouts/Layout.astro   # <head> con el script anti-FOUC de temas
  pages/index.astro      # header/footer + <TypingGame client:load />
  pages/progreso.astro   # header/footer + <ProgressDashboard client:load />
  styles/global.css
```

## Modelo de datos

- `Level`: `{ id, tier, subLevel, title, instructions, texts[], minWpm, minAccuracy }`.
  `texts` es un pool; `pickRandomText(level)` elige uno al azar en cada intento.
- `LevelResult`: `{ levelId, wpm, accuracy, errors, durationMs, passed }`.
- `GameState` (store): `playerName`, `unlockedLevelId` (1-40), `bestResults`
  (`Record<levelId, LevelResult>`, se sobreescribe solo si el nuevo WPM es
  mayor), `completeLevel()`, `resetProgress()` (limpia nivel/resultados, NO
  el nombre), `setPlayerName()`.

## Decisiones de diseño (por qué está así)

- **Precisión por pulsación, no por comparación final**: `useTypingEngine`
  cuenta cada `keydown` de un carácter como acierto/error en el momento en
  que ocurre. Así un error corregido con backspace sigue penalizando la
  precisión, como en un test de mecanografía real.
- **`useTypingEngine(target, onFinish, enabled)`**: el tercer parámetro
  `enabled` existe porque el listener de `keydown` está en `window` — sin él,
  escribir el nombre en `NameModal` o cualquier input futuro sería
  interceptado por el motor del juego (`preventDefault` en cada tecla de un
  carácter). En `TypingGame.tsx`,
  `typingEnabled = Boolean(playerName) && !showResetConfirm` apaga el motor
  mientras cualquier modal esté abierto.
- **Pills de WPM/Precisión muestran datos distintos según el estado**:
  - `status === 'idle'` (nivel recién seleccionado, aún no escribes): las
    pills muestran `bestResults[activeLevel.id]` (tu mejor marca histórica)
    con las etiquetas "Mejor WPM"/"Mejor precisión", o `–` si nunca lo
    intentaste. Antes mostraban `0`/`100%` del motor en reposo, lo cual se
    leía como un resultado real y confundía — se corrigió en esta sesión.
  - En cuanto `status` pasa a `running`/`finished`, las mismas pills cambian
    a mostrar el intento en vivo (`stats.wpm`/`stats.accuracy`) con las
    etiquetas normales "WPM"/"Precisión".
  - Debajo del título del nivel hay una leyenda aparte ("Nivel superado" /
    "Aún no superado") que solo indica el estado, sin repetir los números.
- **`LevelSelector`**: cada botón de subnivel ya intentado muestra un punto
  de color en la esquina (verde = superado, rojo = no superado) más un
  `title` nativo con el detalle — vista rápida de progreso sin abrir cada
  nivel.
- **`resetProgress()` no borra `playerName`**: reiniciar progreso vuelve a
  nivel 1 y borra `bestResults`, pero no vuelve a pedir el nombre (son
  conceptos separados en el store).
- **Modal de confirmación reutilizable** (`ConfirmModal.tsx`): genérico por
  diseño (title/message/confirmLabel/cancelLabel/onConfirm/onCancel) porque
  ya se usa para el reset de progreso y es el patrón natural para cualquier
  acción destructiva futura.
- **Sistema de temas (Claro / Oscuro)**: una sola clase en `<html>` — sin
  clase (Claro) o `.dark` (Oscuro). `tailwind.config.mjs` define
  `darkMode: 'class'`; no hay plugins propios. Persistencia en
  `localStorage['theme-preference']` (`'light' | 'dark'`).
  - Hubo un tercer tema ("Mixto", fondo claro + superficies flotantes
    oscuras vía una variante `mixed:` custom) que se quitó por completo a
    petición del usuario — si aparece código o documentación mencionando
    `mixed`/`theme-mixed`/`Mixto`, es resto sin limpiar de esa época, no
    algo a reintroducir.
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
    inicializador de `useState` provocaba un hydration mismatch entre ese
    render de servidor y el del cliente, y el toggle quedaba inconsistente
    (mostraba "Claro" activo tras recargar con "Oscuro" guardado, no dejaba
    seleccionar algunas opciones, o marcaba dos botones activos a la vez).
    La solución: arrancar en `null` (ningún botón activo, igual que el
    servidor) y sincronizar el valor real de `localStorage` en un
    `useEffect` que solo corre en el cliente — mismo patrón que usan
    librerías como `next-themes` para este problema.
- **Dashboard de progreso (`/progreso`, `ProgressDashboard.tsx`)**: no crea
  ninguna fuente de datos nueva — lee directamente `bestResults` y
  `unlockedLevelId` de `useGameStore` y cruza con `LEVELS` de `data/levels.ts`.
  Como `completeLevel()` ya actualiza el store en cada intento, la gráfica se
  re-renderiza sola sin sincronización extra.
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
- **WPM en vivo oculto durante el primer segundo** (`useTypingEngine.ts`): con
  muy poco tiempo transcurrido, cualquier carácter escrito producía un WPM
  absurdamente alto (ej. 1 carácter en 10ms ≈ 1200 WPM) porque los minutos se
  clampeaban a un mínimo de 1ms. Ahora `stats.wpm` devuelve `0` mientras
  `elapsedMs < 1000`, así que el número solo aparece una vez que hay una
  medición real detrás.
- **`TypingGame` usa un `<input>` real (`sr-only`) en vez de un `<div
  tabIndex>` para el foco**: el motor sigue escuchando `keydown` en `window`
  (no cambió), pero antes no había ningún elemento de formulario real en el
  árbol — inaccesible para lectores de pantalla y poco fiable en teclados
  virtuales de móvil. El contenedor usa `focus-within:ring-2` en vez de
  `focus:ring-2` porque el foco ahora vive en el input hijo, no en el propio
  `div`. También hay una región `aria-live="polite"` (`sr-only`) que anuncia
  el resultado del intento (aprobado/no aprobado, WPM, precisión) para quien
  no puede ver el `ResultsOverlay`.
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
  marcan como error el patrón de leer `ref.current` dentro de `useMemo` que
  ya usaba `useTypingEngine` — válido en React 18 sin Compiler, pero no en
  ese preset). `npm run format` solo se corrió sobre los archivos tocados en
  la sesión que introdujo esta configuración, no sobre todo el repo — ver
  "Pendiente" más abajo.
- **`playKeySound()` se llama dentro del updater de `setTyped`, junto a los
  contadores de keystrokes** (`useTypingEngine.ts`): no es el patrón más
  "puro" para un hook, pero es exactamente el único punto donde ya se
  calcula `isCorrect` por pulsación, y el hook ya tenía efectos secundarios
  ahí (mutar refs). `playKeySound()` es un no-op seguro en SSR/tests
  (`getAudioContext()` devuelve `null` si `window.AudioContext` no existe),
  por eso los tests de Vitest no necesitan mockearlo.
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

- El contenido de `levels.ts` tiene solo 3 variantes de texto por subnivel
  como demostración de la estructura — falta ampliar/curar el pool real de
  los 40 niveles.
- No se decidió si `resetProgress()` debería tener una variante que también
  borre `playerName` (por ahora, no lo hace).
- Sitemap (`@astrojs/sitemap`) sin añadir: falta definir `site` en
  `astro.config.mjs` con el dominio real de producción antes de que valga la
  pena instalarlo.
- `npm run format` no se ha corrido sobre todo el repo, solo sobre los
  archivos tocados en las sesiones que introdujeron ESLint/Prettier y las
  piezas de Nivel Medio — falta un commit dedicado solo a formateo para no
  mezclarlo con cambios funcionales.
- Analítica de producto (Plausible/Umami) sin añadir — pendiente a propósito,
  es el único punto del "Nivel Medio" de la hoja de ruta que no se
  implementó (implica elegir y desplegar un servicio externo).
- `useTypingEngine.test.ts` cubre el cálculo de WPM/precisión; no hay tests
  de componentes (`TypingGame`, `ProgressDashboard`) ni end-to-end.
