import { BarChart3, Gamepad2, ShoppingCart, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { formatCount, formatSom } from '@/lib/format';
import type { DashboardStats } from '@/lib/dashboardStats';

interface TodayStatsProps {
  today: DashboardStats['today'];
}

interface Item {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
}

export function TodayStats({ today }: TodayStatsProps) {
  const items: Item[] = [
    { label: 'Seanslar', value: `${formatCount(today.sessions)} ta`, icon: Gamepad2, tone: 'text-brand-400' },
    { label: 'Sotuvlar', value: `${formatCount(today.saleQuantity)} dona`, icon: ShoppingCart, tone: 'text-success-400' },
    { label: 'Xarid va xarajatlar', value: `${formatCount(today.expenses)} ta`, icon: Wallet, tone: 'text-warning-400' },
    { label: 'Jami kirim', value: formatSom(today.cashIn), icon: BarChart3, tone: 'text-success-400' },
    { label: 'Jami chiqim', value: formatSom(today.cashOut), icon: Wallet, tone: 'text-danger-400' },
    { label: 'Tushum', value: formatSom(today.income), icon: BarChart3, tone: 'text-success-400' },
    { label: 'Tannarx va operatsion xarajat', value: formatSom(today.expense), icon: Wallet, tone: 'text-warning-400' },
    { label: 'Sof foyda', value: formatSom(today.profit), icon: BarChart3, tone: today.profit >= 0 ? 'text-cyan-400' : 'text-danger-400' },
    { label: 'Naqd pul aylanmasi', value: formatSom(today.turnover), icon: BarChart3, tone: 'text-cyan-400' },
  ];

  return (
    <Panel title="Bugungi statistika" icon={<BarChart3 className="h-5 w-5" strokeWidth={1.75} />}>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-surface-700/70 sm:grid-cols-3 lg:grid-cols-4">
        {items.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex flex-col items-center gap-2 bg-surface-800 px-4 py-5 text-center">
            <Icon className={`h-7 w-7 ${tone}`} strokeWidth={1.75} />
            <dt className="text-sm text-slate-400">{label}</dt>
            <dd className="text-base font-semibold text-slate-100">{value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
