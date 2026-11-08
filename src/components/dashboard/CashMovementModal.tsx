import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import type { CashMovementKind } from '@/types/club';
import type { StaffRole } from '@/types/club';
import { TransactionActorFields } from '@/components/dashboard/TransactionActorFields';

interface CashMovementModalProps {
  kind: CashMovementKind;
  onSubmit: (kind: CashMovementKind, amount: number, note: string, actor: { name: string; role: Exclude<StaffRole, 'unknown'> }) => Promise<void>;
  onClose: () => void;
}

const COPY: Record<CashMovementKind, { title: string; button: string; tone: string }> = {
  cash_in: { title: 'Pul kiritish', button: 'Kiritish', tone: 'bg-success-600 hover:bg-success-500' },
  cash_out: { title: 'Pul olish', button: 'Olish', tone: 'bg-danger-500 hover:bg-danger-400' },
};

export function CashMovementModal({ kind, onSubmit, onClose }: CashMovementModalProps) {
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actorName, setActorName] = useState('');
  const [actorRole, setActorRole] = useState<Exclude<StaffRole, 'unknown'>>('operator');
  const copy = COPY[kind];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSaving, onClose]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = Number(amountText.replace(/\s/g, ''));
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError('Summani musbat butun son sifatida kiriting');
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSubmit(kind, amount, note.trim(), { name: actorName, role: actorRole });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/70 p-4 backdrop-blur-sm" onMouseDown={() => !isSaving && onClose()}>
      <form
        onSubmit={handleSubmit}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-movement-title"
        className="w-full max-w-md rounded-2xl border border-surface-600 bg-surface-800 p-6 shadow-2xl"
      >
        <header className="mb-5 flex items-center justify-between">
          <h2 id="cash-movement-title" className="text-lg font-semibold text-slate-100">{copy.title}</h2>
          <button
            type="button"
            onClick={() => !isSaving && onClose()}
            disabled={isSaving}
            aria-label="Yopish"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-surface-700 hover:text-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <label className="mb-4 flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Summa (so'm)</span>
          <input
            inputMode="numeric"
            autoFocus
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            placeholder="Masalan: 50 000"
            className="rounded-xl border border-surface-600 bg-surface-900 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
          />
        </label>

        <label className="mb-2 flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Izoh (ixtiyoriy)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={120}
            className="rounded-xl border border-surface-600 bg-surface-900 px-4 py-3 text-sm text-slate-100 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
          />
        </label>

        <TransactionActorFields name={actorName} role={actorRole} onNameChange={setActorName} onRoleChange={setActorRole} />

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => !isSaving && onClose()}
            disabled={isSaving}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-surface-700 disabled:opacity-50"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${copy.tone}`}
          >
            {kind === 'cash_in' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            {isSaving ? 'Saqlanmoqda...' : copy.button}
          </button>
        </div>
      </form>
    </div>
  );
}
