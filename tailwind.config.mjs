import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [
    // Tema "Mixto": activa `mixed:*` para cualquier elemento dentro de
    // <html class="theme-mixed">, igual que `dark:*` reacciona a <html class="dark">.
    plugin(({ addVariant }) => {
      addVariant('mixed', ':is(.theme-mixed) &');
    }),
  ],
};
