import Modal from '@/components/Modal';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal>
      <h2 className="text-lg font-bold text-slate-700 dark:text-slate-100 mixed:text-slate-100">{title}</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 mixed:text-slate-400">{message}</p>

      <div className="mt-5 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 mixed:bg-slate-700 mixed:text-slate-200 mixed:hover:bg-slate-600"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className="rounded-lg bg-rose-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
