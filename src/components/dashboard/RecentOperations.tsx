import { Gamepad2, History, Package, ShoppingCart, Wallet, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { formatCount, formatSom, formatTime } from '@/lib/format';
import type { Transaction, TransactionKind } from '@/types/club';

interface RecentOperationsProps { transactions: Transaction[]; query: string }
const KIND_META: Record<TransactionKind, { label: string; icon: LucideIcon; tone: string; sign: 1 | -1 }> = {
  session: { label: 'Seans', icon: Gamepad2, tone: 'text-brand-400', sign: 1 },
  sale: { label: 'Sotuv', icon: ShoppingCart, tone: 'text-success-400', sign: 1 },
  purchase: { label: 'Tovar xaridi', icon: Package, tone: 'text-warning-400', sign: -1 },
  expense: { label: 'Xarajat', icon: Wrench, tone: 'text-warning-400', sign: -1 },
  cash_in: { label: 'Kassa kirimi', icon: Wallet, tone: 'text-success-400', sign: 1 },
  cash_out: { label: 'Kassa chiqimi', icon: Wallet, tone: 'text-danger-400', sign: -1 },
  stock_opening: { label: "Boshlang'ich ombor", icon: Package, tone: 'text-brand-400', sign: 1 },
  stock_adjustment: { label: "Ombor qoldig'i tahriri", icon: Package, tone: 'text-brand-400', sign: 1 },
};
const PAGE_SIZE = 10;
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function RecentOperations({ transactions, query }: RecentOperationsProps) {
  const [kindFilter, setKindFilter] = useState<TransactionKind | 'all'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rowLimit, setRowLimit] = useState(PAGE_SIZE);
  const needle = query.trim().toLowerCase();
  const matching = useMemo(() => transactions.filter((transaction) => {
    const timestamp = Date.parse(transaction.created_at);
    if (!Number.isFinite(timestamp)) return false;
    const day = localDateKey(new Date(timestamp));
    return (kindFilter === 'all' || transaction.kind === kindFilter)
      && (!fromDate || day >= fromDate)
      && (!toDate || day <= toDate)
      && (!needle || `${transaction.title} ${transaction.detail}`.toLowerCase().includes(needle));
  }).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)), [fromDate, kindFilter, needle, toDate, transactions]);
  const visible = matching.slice(0, rowLimit);

  return <Panel title="Songgi operatsiyalar" icon={<History className="h-5 w-5" strokeWidth={1.75} />} className="xl:col-span-2">
    <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-[11px] text-slate-500">Operatsiya turi<select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as TransactionKind | 'all')} className="rounded-lg border border-surface-600 bg-surface-900 px-2 py-2 text-xs text-slate-200"><option value="all">Barchasi</option>{Object.entries(KIND_META).map(([kind, meta]) => <option key={kind} value={kind}>{meta.label}</option>)}</select></label>
      <label className="flex flex-col gap-1 text-[11px] text-slate-500">Sanadan<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="min-w-0 rounded-lg border border-surface-600 bg-surface-900 px-2 py-2 text-xs text-slate-200" /></label>
      <label className="flex flex-col gap-1 text-[11px] text-slate-500">Sanagacha<input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} className="min-w-0 rounded-lg border border-surface-600 bg-surface-900 px-2 py-2 text-xs text-slate-200" /></label>
    </div>
    {visible.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Bu shartlarga mos operatsiya topilmadi.</p> : <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead><tr className="border-b border-surface-600 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2.5 font-medium">Sana va vaqt</th><th className="px-3 py-2.5 font-medium">Tur</th><th className="px-3 py-2.5 font-medium">Tafsilot</th><th className="px-3 py-2.5 font-medium">Mas'ul</th><th className="px-3 py-2.5 text-right font-medium">Dona</th><th className="px-3 py-2.5 text-right font-medium">Summa</th></tr></thead>
        <tbody>{visible.map((transaction) => {
          const meta = KIND_META[transaction.kind];
          const Icon = meta.icon;
          return <tr key={transaction.id} className="border-b border-surface-700/70 transition-colors last:border-0 hover:bg-surface-700/40">
            <td className="px-3 py-3 text-slate-400">{formatTime(transaction.created_at)}</td>
            <td className="px-3 py-3"><span className="flex items-center gap-2 text-slate-200"><Icon className={`h-4 w-4 ${meta.tone}`} strokeWidth={1.75} />{meta.label}</span></td>
            <td className="max-w-[180px] truncate px-3 py-3 text-slate-300" title={transaction.detail || transaction.title}>{transaction.detail ? `${transaction.title} | ${transaction.detail}` : transaction.title}</td>
            <td className="px-3 py-3 text-slate-400">{transaction.handled_by || 'Noma\'lum'}<span className="block text-[10px]">{transaction.handled_as === 'manager' ? 'Rahbar' : transaction.handled_as === 'operator' ? 'Operator' : 'Eski yozuv'}</span></td>
            <td className="px-3 py-3 text-right text-slate-300">{transaction.quantity ? `${transaction.kind === 'stock_adjustment' && transaction.quantity > 0 ? '+' : ''}${formatCount(transaction.quantity)} dona` : '-'}</td>
            <td className={`px-3 py-3 text-right font-semibold ${transaction.kind === 'stock_adjustment' && (transaction.quantity ?? 0) < 0 ? 'text-danger-400' : meta.sign === 1 ? 'text-success-400' : 'text-danger-400'}`}>{transaction.kind === 'stock_opening' ? `Ombor qiymati ${formatSom((transaction.unit_cost ?? 0) * (transaction.quantity ?? 0))}` : transaction.kind === 'stock_adjustment' ? 'Qoldiq o‘zgartirildi' : `${meta.sign === 1 ? '+' : '-'}${formatSom(transaction.amount)}`}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500"><span>Jami {formatCount(transactions.length)} operatsiya | Mos: {formatCount(matching.length)} | Ko'rsatilgan: {formatCount(visible.length)}</span>{visible.length < matching.length && <button type="button" onClick={() => setRowLimit((limit) => Math.min(limit + PAGE_SIZE, matching.length))} className="rounded-lg px-3 py-2 font-semibold text-brand-300 hover:bg-surface-700">Yana {Math.min(PAGE_SIZE, matching.length - visible.length)} ta ko'rsatish</button>}</div>
  </Panel>;
}
