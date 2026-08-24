import { cn } from '@/lib/cn';

// Filas QWERTY simplificadas: solo letras/dígitos/puntuación que
// efectivamente aparecen en los textos de src/data/levels.ts (incluye los
// símbolos de código del tier "master": ( ) { } [ ] < > ` $ etc.). No es un
// layout físico exacto, es un refuerzo visual de "qué tecla sigue".
const LETTER_ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const PUNCTUATION_KEYS = [
  '.',
  ',',
  ';',
  ':',
  "'",
  '"',
  '¿',
  '?',
  '¡',
  '!',
  '-',
  '_',
  '=',
  '+',
  '*',
  '/',
  '\\',
  '(',
  ')',
  '{',
  '}',
  '[',
  ']',
  '<',
  '>',
  '`',
  '$',
  '%',
  '#',
  '@',
];

function KeyCap({ label, active, wide }: { label: string; active: boolean; wide?: boolean }) {
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-md border font-mono text-xs transition-colors',
        wide ? 'min-w-[6rem] px-2 py-1' : 'min-w-[1.75rem] px-1.5 py-1',
        active
          ? 'border-teal-500 bg-teal-500 text-white shadow-sm dark:border-teal-400'
          : 'border-slate-200 bg-white/70 text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400',
      )}
    >
      {label}
    </span>
  );
}

export default function VirtualKeyboard({ nextChar }: { nextChar: string | undefined }) {
  const target = nextChar?.toLowerCase();
  const isSpace = nextChar === ' ';

  return (
    <div aria-hidden="true" className="mt-4 hidden select-none flex-col items-center gap-1 sm:flex">
      {LETTER_ROWS.map((row, i) => (
        <div key={i} className="flex gap-1">
          {row.map((key) => (
            <KeyCap key={key} label={key} active={!isSpace && target === key} />
          ))}
        </div>
      ))}
      <div className="flex max-w-md flex-wrap justify-center gap-1">
        {PUNCTUATION_KEYS.map((key) => (
          <KeyCap key={key} label={key} active={!isSpace && target === key} />
        ))}
      </div>
      <KeyCap label="espacio" active={isSpace} wide />
    </div>
  );
}
