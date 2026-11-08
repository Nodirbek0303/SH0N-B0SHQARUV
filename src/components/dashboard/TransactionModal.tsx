import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { formatSom } from '@/lib/format';
import type { TransactionKind } from '@/types/club';
import type { StaffRole } from '@/types/club';
import { TransactionActorFields } from '@/components/dashboard/TransactionActorFields';

interface Props {
  kind: Extract<TransactionKind, 'session' | 'expense'>;
  onSubmit: (kind: Props['kind'], amount: number, note: string, actor: { name: string; role: Exclude<StaffRole, 'unknown'> }) => Promise<void>;
  onClose: () => void;
}

const COPY = {
  session: { title: 'Seans tushumini yozish', label: 'Seans yoki kompyuter izohi', button: 'Seansni saqlash' },
  expense: { title: 'Xarajat yozish', label: 'Xarajat sababi', button: 'Xarajatni saqlash' },
};

export function TransactionModal({ kind, onSubmit, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actorName, setActorName] = useState('');
  const [actorRole, setActorRole] = useState<Exclude<StaffRole, 'unknown'>>('operator');

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [saving, onClose]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(amount.replace(/\s/g, ''));
    if (!Number.isSafeInteger(value) || value <= 0) {
      setError('Summani musbat butun son sifatida kiriting.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(kind, value, note.trim(), { name: actorName, role: actorRole });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Operatsiya saqlanmadi.');
      setSaving(false);
    }
  };

  const copy = COPY[kind];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/70 p-4 backdrop-blur-sm" onMouseDown={() => !saving && onClose()}>
      <form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl border border-surface-600 bg-surface-800 p-6 shadow-2xl">
        <header className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">{copy.title}</h2>
          <button type="button" aria-label="Yopish" onClick={() => !saving && onClose()} disabled={saving}><X className="h-5 w-5 text-slate-400" /></button>
        </header>
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          Summa (so'm)
          <input required autoFocus inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Masalan: 50 000" className="rounded-xl border border-surface-600 bg-surface-900 px-4 py-3 text-slate-100" />
        </label>
        <label className="mt-4 flex flex-col gap-2 text-sm text-slate-300">
          {copy.label}
          <input maxLength={120} value={note} onChange={(event) => setNote(event.target.value)} className="rounded-xl border border-surface-600 bg-surface-900 px-4 py-3 text-slate-100" />
        </label>
        <TransactionActorFields name={actorName} role={actorRole} onNameChange={setActorName} onRoleChange={setActorRole} />
        <p className="mt-3 text-xs text-slate-500">Kiritiladigan summa: {formatSom(Number(amount.replace(/\s/g, '')) || 0)}</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-danger-500/10 px-3 py-2 text-sm text-danger-400">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => !saving && onClose()} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:bg-surface-700">Bekor qilish</button>
          <button disabled={saving} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saqlanmoqda...' : copy.button}</button>
        </div>
      </form>
    </div>
  );
}
