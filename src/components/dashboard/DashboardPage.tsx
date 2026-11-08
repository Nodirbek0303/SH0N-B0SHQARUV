import { useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { CashBalance } from '@/components/dashboard/CashBalance';
import { CashMovementModal } from '@/components/dashboard/CashMovementModal';
import { RecentOperations } from '@/components/dashboard/RecentOperations';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { StatCards } from '@/components/dashboard/StatCards';
import { TodayStats } from '@/components/dashboard/TodayStats';
import { TransactionModal } from '@/components/dashboard/TransactionModal';
import { TopBar } from '@/components/layout/TopBar';
import { useClubData } from '@/hooks/useClubData';
import { computeDashboardStats } from '@/lib/dashboardStats';
import type { CashMovementKind, TransactionKind } from '@/types/club';

export function DashboardPage() {
  const { data, error, isLoading, isRefreshing, reload, addCashMovement, addTransaction } = useClubData();
  const [query, setQuery] = useState('');
  const [cashModal, setCashModal] = useState<CashMovementKind | null>(null);
  const [transactionModal, setTransactionModal] = useState<Extract<TransactionKind, 'session' | 'expense'> | null>(null);
  const stats = useMemo(() => data ? computeDashboardStats(data.transactions, data.products, new Date()) : null, [data]);

  return <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-6">
    <TopBar query={query} onQueryChange={setQuery} data={data} />
    {isLoading && <div className="flex items-center justify-center gap-3 py-24 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /><span>Ma'lumotlar yuklanmoqda...</span></div>}
    {!isLoading && !data && error && <div className="flex flex-col items-center gap-4 rounded-2xl border border-danger-500/30 bg-danger-500/10 px-6 py-16 text-center"><p className="text-sm text-danger-300">{error}</p><p className="max-w-xl text-xs text-slate-400">Bulut ma’lumotlarini yuklab bo‘lmadi. Internet aloqasi va hisob ruxsatlarini tekshirib, qayta urinib ko‘ring.</p><button type="button" onClick={reload} disabled={isRefreshing} className="flex items-center gap-2 rounded-xl bg-surface-700 px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-surface-600 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />Qayta urinish</button></div>}
    {data && error && <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-warning-400/20 bg-warning-400/10 px-4 py-3 text-sm text-warning-400"><span>{error} Oldingi ma'lumotlar ko'rsatilmoqda.</span><button type="button" onClick={reload} disabled={isRefreshing} className="shrink-0 font-semibold underline">Yangilash</button></div>}
    {data && stats && <div id="dashboard" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">SHON CLUB | BOSHQARUV</p><h1 className="mt-1 text-2xl font-bold text-slate-50">Klub holati</h1><p className="mt-1 text-sm text-slate-400">Bugungi pul oqimi va klub faoliyati</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setTransactionModal('session')} className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-400">+ Seans tushumi</button><button type="button" onClick={() => setTransactionModal('expense')} className="rounded-xl border border-surface-600 bg-surface-800 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-surface-700">+ Xarajat</button></div></div>
      <StatCards stats={stats} />
      <RevenueChart week={stats.week} incomeChange={stats.trends.income} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3"><RecentOperations transactions={data.transactions} query={query} /><CashBalance balance={stats.totals.cashBalance} onOpen={setCashModal} /></div>
      <TodayStats today={stats.today} />
    </div>}
    {cashModal && <CashMovementModal kind={cashModal} onSubmit={addCashMovement} onClose={() => setCashModal(null)} />}
    {transactionModal && <TransactionModal kind={transactionModal} onSubmit={addTransaction} onClose={() => setTransactionModal(null)} />}
  </main>;
}
