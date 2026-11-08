import { Clock, Gamepad2, TrendingUp, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TrendBadge } from '@/components/ui/TrendBadge';
import { formatCount, formatSom } from '@/lib/format';
import type { DashboardStats } from '@/lib/dashboardStats';

interface StatCardsProps { stats: DashboardStats }
interface CardConfig { label: string; value: string; trend: number | null; goodWhenUp: boolean; icon: LucideIcon; iconTone: string; trendLabel: string }

export function StatCards({ stats }: StatCardsProps) {
  const compareLabel = (value: number | null, period: string) => value === null ? `oldingi ${period}da ma’lumot yo‘q` : `${period}ga nisbatan`;
  const cards: CardConfig[] = [
    { label: 'Haftalik tushum', value: formatSom(stats.rangeTotals.income), trend: stats.trends.income, goodWhenUp: true, icon: Gamepad2, iconTone: 'from-brand-400 to-brand-600', trendLabel: compareLabel(stats.trends.income, 'haftaning shu davri') },
    { label: 'Haftalik xarajat', value: formatSom(stats.rangeTotals.expense), trend: stats.trends.expense, goodWhenUp: false, icon: Wallet, iconTone: 'from-success-400 to-success-600', trendLabel: compareLabel(stats.trends.expense, 'haftaning shu davri') },
    { label: 'Haftalik mablag‘lar farqi', value: formatSom(stats.rangeTotals.profit), trend: stats.trends.profit, goodWhenUp: true, icon: TrendingUp, iconTone: 'from-cyan-400 to-brand-500', trendLabel: compareLabel(stats.trends.profit, 'haftaning shu davri') },
    { label: 'Bugungi seanslar', value: `${formatCount(stats.today.sessions)} ta`, trend: stats.trends.sessions, goodWhenUp: true, icon: Clock, iconTone: 'from-slate-500 to-slate-700', trendLabel: compareLabel(stats.trends.sessions, 'kechaga') },
  ];
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, trend, goodWhenUp, icon: Icon, iconTone, trendLabel }) => <article key={label} className="group flex items-center gap-4 rounded-2xl border border-surface-600/70 bg-surface-800/80 p-5 shadow-xl shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-400/40"><div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${iconTone} shadow-lg`}><Icon className="h-7 w-7 text-white" strokeWidth={1.75} /></div><div className="min-w-0"><p className="text-sm font-medium text-slate-400">{label}</p><p className="mt-1 truncate text-xl font-bold text-slate-50">{value}</p><div className="mt-1 flex items-center gap-2"><TrendBadge value={trend} goodWhenUp={goodWhenUp} /><span className="truncate text-xs text-slate-500">{trendLabel}</span></div></div></article>)}</div>;
}
