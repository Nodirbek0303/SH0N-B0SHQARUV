import { CalendarDays, Search } from 'lucide-react';
import { formatDateLong } from '@/lib/format';

interface TopBarProps { query: string; onQueryChange: (value: string) => void }

export function TopBar({ query, onQueryChange }: TopBarProps) {
  const today = formatDateLong(new Date());
  return <header className="flex flex-wrap items-center gap-3 pb-6 pl-12 lg:pl-0">
    <label className="relative flex min-w-[180px] flex-1 items-center"><Search className="pointer-events-none absolute left-4 h-4 w-4 text-slate-400" /><span className="sr-only">Operatsiyalarni qidirish</span><input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Operatsiyalarni qidirish..." className="w-full rounded-xl border border-surface-600 bg-surface-800/80 py-2.5 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30" /></label>
    <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start sm:gap-4"><div className="flex items-center gap-2 rounded-xl border border-surface-600 bg-surface-800/80 px-3 py-2 sm:gap-3 sm:px-4"><CalendarDays className="h-5 w-5 text-brand-300" /><div className="leading-tight"><p className="text-sm font-semibold text-slate-100">{today.date}</p><p className="text-xs text-slate-400">{today.weekday}</p></div></div></div>
  </header>;
}
