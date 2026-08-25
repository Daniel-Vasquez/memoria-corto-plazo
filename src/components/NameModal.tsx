import { useState, type FormEvent } from 'react';
import Modal from '@/components/Modal';

export default function NameModal({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <Modal>
      <form onSubmit={handleSubmit}>
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-100">
          ¡Bienvenido al juego de Memoria!
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ¿Cómo te llamas? Usaremos tu nombre para guardar tu progreso.
        </p>

        <input
          autoFocus
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tu nombre"
          maxLength={30}
          className="mt-4 w-full rounded-lg border border-slate-300 bg-white/70 px-3 py-2 font-mono text-slate-700 outline-none focus:ring-2 focus:ring-teal-400 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-100"
        />

        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-4 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Comenzar
        </button>
      </form>
    </Modal>
  );
}
