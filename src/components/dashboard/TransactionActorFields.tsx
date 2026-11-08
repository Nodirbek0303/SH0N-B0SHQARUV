import type { StaffRole } from '@/types/club';

interface Props {
  name: string;
  role: Exclude<StaffRole, 'unknown'>;
  onNameChange: (value: string) => void;
  onRoleChange: (value: Exclude<StaffRole, 'unknown'>) => void;
}

export function TransactionActorFields({ name, role, onNameChange, onRoleChange }: Props) {
  return <fieldset className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-surface-600 p-3 sm:grid-cols-[1fr_1.3fr]">
    <legend className="px-1 text-xs font-medium text-slate-400">Pulni olgan yoki amalni bajargan mas'ul</legend>
    <label className="flex flex-col gap-1 text-xs text-slate-400">Mas'ul turi<select required value={role} onChange={(event) => onRoleChange(event.target.value as Exclude<StaffRole, 'unknown'>)} className="rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-slate-100"><option value="operator">Operator</option><option value="manager">Rahbar</option></select></label>
    <label className="flex flex-col gap-1 text-xs text-slate-400">Ismi<input required maxLength={60} value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Ism familiya" className="rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-slate-100" /></label>
  </fieldset>;
}
