import type { Level, Tier, TierMeta } from '@/types/game';

export const TIERS: TierMeta[] = [
  {
    id: 'basico',
    label: 'Básico',
    description: 'Fila guía, letras minúsculas y palabras cortas.',
    colorClass: 'text-emerald-600',
  },
  {
    id: 'medio',
    label: 'Medio',
    description: 'Abecedario completo, mayúsculas con Shift y palabras largas.',
    colorClass: 'text-sky-600',
  },
  {
    id: 'avanzado',
    label: 'Avanzado',
    description: 'Números, signos de puntuación y frases completas.',
    colorClass: 'text-amber-600',
  },
  {
    id: 'master',
    label: 'Master',
    description: 'Párrafos y fragmentos de código real.',
    colorClass: 'text-rose-500',
  },
];

/**
 * Cada tier define 10 pools de texto (uno por subnivel) con dificultad
 * progresiva. El motor del juego elige aleatoriamente un texto del pool
 * del subnivel activo para variar la práctica en cada intento.
 */
// Básico: un solo token corto por variante (máx. 6 caracteres, sin
// espacios) — memorizar y reescribir una palabra completa es más fiel a
// "memoria a corto plazo" que una frase larga con espacios de por medio.
const BASICO_TEXTS: string[][] = [
  ['asdf', 'jkl;', 'asa'],
  ['klas', 'fads', 'jak'],
  ['salada', 'kasa', 'dala'],
  ['halas', 'jalas', 'kasal'],
  ['dalia', 'falda', 'jade'],
  ['nube', 'rama', 'lija'],
  ['perro', 'luna', 'tren'],
  ['limon', 'silla', 'cielo'],
  ['viento', 'zorro', 'verde'],
  ['duerme', 'cama', 'sopa'],
];

const MEDIO_TEXTS: string[][] = [
  ['Abril Bogota Cielo Dedo', 'Wifi Xilofono Yema Zorro', 'Quimica Werner Ganso'],
  ['Madrid Bolivia Chile Peru', 'Uruguay Ecuador Panama', 'Argentina Colombia Mexico'],
  ['La Paz es la capital', 'El Rio Amazonas es largo', 'Bogota tiene montañas'],
  ['Cocinar Desayunar Almorzar', 'Trabajar Estudiar Aprender', 'Escribir Leer Practicar'],
  ['Programar Diseñar Construir', 'Aventura Montaña Bosque', 'Tecnologia Innovacion Futuro'],
  [
    'El Programador Escribe Codigo',
    'La Diseñadora Crea Interfaces',
    'El Estudiante Practica Todos',
  ],
  [
    'Biblioteca Universidad Escuela',
    'Restaurante Hospital Mercado',
    'Aeropuerto Estacion Terminal',
  ],
  ['Barcelona Valencia Sevilla', 'Santiago Caracas Guatemala', 'Habana Quito Asuncion'],
  [
    'Felicidad Esperanza Confianza',
    'Creatividad Perseverancia Disciplina',
    'Curiosidad Paciencia Constancia',
  ],
  ['Hoy Entrenamos La Memoria', 'Nuestro Objetivo Es Mejorar', 'Cada Practica Suma Progreso'],
];

const AVANZADO_TEXTS: string[][] = [
  ['1234567890', '13 57 90 24 68', '12 de marzo de 2026'],
  [
    'Tengo 25 años y vivo en el piso 3.',
    'El examen es el 14 de abril.',
    'Compré 10 manzanas y 5 peras.',
  ],
  [
    'Hola, ¿cómo estás? Muy bien, gracias.',
    '¡Qué día tan bonito hace hoy!',
    '¿Vienes a la fiesta el sábado?',
  ],
  [
    'El niño comió pan, queso y jamón.',
    'María, José y Andrés llegaron tarde.',
    'Ayer llovió; hoy hace sol.',
  ],
  [
    'El café cuesta $2.50 con impuesto.',
    'La reunión es a las 9:30 a.m.',
    'El descuento es del 15% hoy.',
  ],
  [
    '"La práctica hace al maestro", dijo ella.',
    'Compramos: pan, leche, huevos y café.',
    'Él preguntó: ¿ya terminaste la tarea?',
  ],
  [
    'El número de teléfono es 555-01-23.',
    'La dirección es Calle 45 #12-30.',
    'El código postal es 28013.',
  ],
  [
    'Según el informe, el 82% aprobó el curso.',
    'La empresa creció un 7,4% este año.',
    'El vuelo sale a las 06:45 del aeropuerto.',
  ],
  [
    'La rápida práctica mejora la precisión.',
    'Ñoño comió ñame con mañana serena.',
    'El águila voló sobre la montaña.',
  ],
  [
    '"El tiempo, decía Séneca, es lo único que no se puede recuperar."',
    'La ecuación es: 3x + 7 = 22, despeja x.',
    'Su email es contacto@empresa.com; responde pronto.',
  ],
];

const MASTER_TEXTS: string[][] = [
  [
    'const suma = (a, b) => a + b;',
    'function saludar(nombre) { return `Hola, ${nombre}`; }',
    'let usuarios = ["Ana", "Luis", "Marta"];',
  ],
  [
    '<div class="container"><p>Hola mundo</p></div>',
    '<ul><li>Uno</li><li>Dos</li><li>Tres</li></ul>',
    '<a href="https://sitio.com" target="_blank">Enlace</a>',
  ],
  [
    '.contenedor { display: flex; justify-content: center; }',
    'body { margin: 0; padding: 0; font-family: sans-serif; }',
    '.btn:hover { background-color: #334155; color: #fff; }',
  ],
  [
    'if (edad >= 18) { console.log("Es mayor de edad"); }',
    'for (let i = 0; i < 10; i++) { total += i; }',
    'while (activo) { procesarEvento(evento); }',
  ],
  [
    'const usuario = { nombre: "Ana", edad: 30, activo: true };',
    'const { nombre, edad } = usuario;',
    'const nuevaLista = [...lista, "elemento"];',
  ],
  [
    'export default function App() { return <div>Hola</div>; }',
    'import React, { useState } from "react";',
    'const [contador, setContador] = useState(0);',
  ],
  [
    'try { riesgo(); } catch (error) { console.error(error); }',
    'async function obtenerDatos() { const res = await fetch(url); }',
    'promise.then(resultado => console.log(resultado));',
  ],
  [
    'SELECT nombre, edad FROM usuarios WHERE activo = 1;',
    'INSERT INTO productos (nombre, precio) VALUES ("Taza", 9.99);',
    'UPDATE clientes SET email = "nuevo@mail.com" WHERE id = 4;',
  ],
  [
    'La abstracción permite ocultar la complejidad interna de un sistema.',
    'Un algoritmo eficiente reduce el tiempo de ejecución y el uso de memoria.',
    'El control de versiones permite colaborar sin sobrescribir el trabajo ajeno.',
  ],
  [
    'function debounce(fn, delay) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; }',
    'const esPar = (n) => n % 2 === 0 ? "par" : "impar";',
    'class Persona { constructor(nombre) { this.nombre = nombre; } saludar() { return `Hola ${this.nombre}`; } }',
  ],
];

function buildTier(
  tier: Tier,
  startId: number,
  pools: string[][],
  minWpm: [number, number],
  minAcc: [number, number],
): Level[] {
  const [wpmStart, wpmEnd] = minWpm;
  const [accStart, accEnd] = minAcc;
  return pools.map((texts, index) => {
    const subLevel = index + 1;
    const progress = index / (pools.length - 1);
    return {
      id: startId + index,
      tier,
      subLevel,
      title: `${tierLabel(tier)} ${subLevel}`,
      instructions: tierInstructions(tier, subLevel),
      texts,
      minWpm: Math.round(wpmStart + (wpmEnd - wpmStart) * progress),
      minAccuracy: Math.round(accStart + (accEnd - accStart) * progress),
    } satisfies Level;
  });
}

function tierLabel(tier: Tier): string {
  return TIERS.find((t) => t.id === tier)?.label ?? tier;
}

function tierInstructions(tier: Tier, subLevel: number): string {
  switch (tier) {
    case 'basico':
      return subLevel <= 4
        ? 'Memoriza estos caracteres de la fila guía (ASDF JKL;) y reescríbelos cuando desaparezcan.'
        : 'Memoriza estas palabras cortas y repítelas de memoria.';
    case 'medio':
      return 'Memoriza el texto completo, incluidas las mayúsculas, y reescríbelo de memoria.';
    case 'avanzado':
      return 'Memoriza números y signos de puntuación con precisión.';
    case 'master':
      return 'Memoriza párrafos y fragmentos de código real, incluidos los símbolos especiales.';
  }
}

export const LEVELS: Level[] = [
  ...buildTier('basico', 1, BASICO_TEXTS, [10, 20], [85, 90]),
  ...buildTier('medio', 11, MEDIO_TEXTS, [20, 30], [88, 92]),
  ...buildTier('avanzado', 21, AVANZADO_TEXTS, [30, 40], [90, 94]),
  ...buildTier('master', 31, MASTER_TEXTS, [40, 60], [94, 97]),
];

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function getLevelsByTier(tier: Tier): Level[] {
  return LEVELS.filter((level) => level.tier === tier);
}

export function pickRandomText(level: Level): string {
  return level.texts[Math.floor(Math.random() * level.texts.length)];
}
