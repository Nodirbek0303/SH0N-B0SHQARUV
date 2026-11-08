import { Wallet } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { formatSom } from '@/lib/format';
import type { CashMovementKind } from '@/types/club';

interface CashBalanceProps { balance: number; onOpen: (kind: CashMovementKind) => void }

export function CashBalance({ balance, onOpen }: CashBalanceProps) {
  return <Panel title="Kassa balansi" icon={<Wallet className="h-5 w-5" strokeWidth={1.75} />}>
    <div className="flex flex-1 flex-col justify-between gap-5">
      <p className="-mb-3 text-center text-xs text-slate-500">Mahalliy hisobdagi barcha pul kirimi va chiqimi</p>
      <p className="rounded-xl bg-surface-900/70 px-4 py-4 text-center text-2xl font-bold tracking-tight text-slate-50">{formatSom(balance)}</p>
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => onOpen('cash_in')} className="rounded-xl bg-success-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-success-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-success-500 active:translate-y-0">+ Pul kiritish</button>
        <button type="button" onClick={() => onOpen('cash_out')} className="rounded-xl bg-danger-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-danger-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-danger-400 active:translate-y-0">- Pul olish</button>
      </div>
    </div>
  </Panel>;
}
