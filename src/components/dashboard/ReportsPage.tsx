import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart3, Loader2, Monitor } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { RecentOperations } from '@/components/dashboard/RecentOperations';
import { DownloadPdfButton } from '@/components/dashboard/DownloadPdfButton';
import { useClubData } from '@/hooks/useClubData';
import { computeReportStats, formatDateKey } from '@/lib/reportStats';
import { formatCount, formatSom } from '@/lib/format';

function initialDates() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  return { from: formatDateKey(from), to: formatDateKey(today) };
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${hours} soat ${minutes} daqiqa ${remainder} soniya`;
}

function trend(current: number, previous: number, goodWhenUp: boolean) {
  if (previous === 0) {
    if (current === 0) return { label: '0% - o\'zgarish yo\'q', tone: 'text-slate-500', Icon: null };
    const isGood = (current > 0) === goodWhenUp;
    return { label: 'Yangi natija', tone: isGood ? 'text-success-400' : 'text-danger-400', Icon: current > 0 ? ArrowUpRight : ArrowDownRight };
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(change);
  const isUp = change >= 0;
  const isGood = isUp === goodWhenUp;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return { label: `${Math.abs(rounded)}% oldingi davrga nisbatan`, tone: isGood ? 'text-success-400' : 'text-danger-400', Icon };
}

export function ReportsPage() {
  const { data, error, isLoading } = useClubData();
  const defaults = useMemo(initialDates, []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const safeFrom = from && to && from > to ? to : from || defaults.from;
  const safeTo = from && to && from > to ? from : to || defaults.to;
  const report = useMemo(() => data ? computeReportStats(data.transactions, data.products, data.computerSessions, data.computers, safeFrom, safeTo, now) : null, [data, now, safeFrom, safeTo]);

  return <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-6">
    {isLoading && <div className="flex items-center justify-center gap-3 py-24 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" />Hisobotlar yuklanmoqda...</div>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-danger-500/10 p-4 text-sm text-danger-300">{error}</p>}
    {report && data && <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">SHON CLUB | TAHLIL</p><h1 className="mt-1 text-2xl font-bold text-slate-50">Hisobotlar</h1><p className="mt-1 text-sm text-slate-400">Davr natijalarini oldingi teng davr bilan solishtiring.</p></div>
        <div className="flex flex-wrap items-end gap-3"><div className="grid grid-cols-2 gap-3 rounded-xl border border-surface-600 bg-surface-800/70 p-3"><label className="flex flex-col gap-1 text-xs text-slate-400">Boshlanish<input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className="rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-slate-100" /></label><label className="flex flex-col gap-1 text-xs text-slate-400">Tugash<input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="rounded-lg border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-slate-100" /></label></div><DownloadPdfButton data={data} /></div>
      </header>

      <p className="-mt-3 text-xs text-slate-500">Tanlangan davr: {safeFrom} - {safeTo}. Taqqoslash davri: {formatDateKey(report.previousFrom)} - {formatDateKey(new Date(report.previousTo.getFullYear(), report.previousTo.getMonth(), report.previousTo.getDate() - 1))}.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Tushum', value: formatSom(report.current.revenue), current: report.current.revenue, previous: report.previous.revenue, good: true },
          { label: 'Sof foyda', value: formatSom(report.current.netProfit), current: report.current.netProfit, previous: report.previous.netProfit, good: true },
          { label: 'Sotilgan dona', value: formatCount(report.current.soldUnits), current: report.current.soldUnits, previous: report.previous.soldUnits, good: true },
          { label: 'Pul chiqimi', value: formatSom(report.current.cashOut), current: report.current.cashOut, previous: report.previous.cashOut, good: false },
          { label: 'Kompyuter ishlagan vaqt', value: formatDuration(report.current.computerRuntimeSeconds), current: report.current.computerRuntimeSeconds, previous: report.previous.computerRuntimeSeconds, good: true },
        ].map((item) => {
          const movement = trend(item.current, item.previous, item.good);
          const Icon = movement.Icon;
          const previousValue = item.label === 'Sotilgan dona' ? formatCount(item.previous) : item.label === 'Kompyuter ishlagan vaqt' ? formatDuration(item.previous) : formatSom(item.previous);
          return <article key={item.label} className="rounded-2xl border border-surface-600/70 bg-surface-800/80 p-5 shadow-xl shadow-black/20"><p className="text-sm font-medium text-slate-400">{item.label}</p><p className="mt-2 truncate text-2xl font-bold text-slate-50">{item.value}</p><p className={`mt-2 flex items-center gap-1 text-xs ${movement.tone}`}>{Icon && <Icon className="h-4 w-4" />}{movement.label}</p><p className="mt-1 text-xs text-slate-500">Oldingi davr: {previousValue}</p></article>;
        })}
      </div>

      <Panel title="Davr bo'yicha pul va faoliyat" icon={<BarChart3 className="h-5 w-5" />}>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[['Pul kirimi', formatSom(report.current.cashIn)], ['Pul chiqimi', formatSom(report.current.cashOut)], ['Kassa farqi', formatSom(report.current.cashChange)], ['Sotuv tannarxi', formatSom(report.current.costOfSales)], ['Operatsion xarajat', formatSom(report.current.operatingExpense)], ['Seanslar', formatCount(report.current.sessions)]].map(([label, value]) => <div key={label} className="rounded-xl bg-surface-900/70 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-100">{value}</dd></div>)}
        </dl>
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Kompyuterlar ishlagan vaqt" icon={<Monitor className="h-5 w-5" />}>
          {report.computers.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Tanlangan davrda kompyuter seansi bo'lmagan.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead><tr className="border-b border-surface-600 text-xs uppercase text-slate-500"><th className="px-2 py-2">Kompyuter</th><th className="px-2 py-2 text-right">Seans</th><th className="px-2 py-2 text-right">Ishlagan vaqt</th></tr></thead><tbody>{report.computers.map((item) => <tr key={item.id} className="border-b border-surface-700/70 last:border-0"><td className="px-2 py-3 text-slate-200">{item.name}</td><td className="px-2 py-3 text-right text-slate-300">{formatCount(item.sessions)}</td><td className="px-2 py-3 text-right font-semibold text-brand-300">{formatDuration(item.runtimeSeconds)}</td></tr>)}</tbody></table></div>}
        </Panel>
        <Panel title="Mahsulotlar savdosi" icon={<BarChart3 className="h-5 w-5" />}>
          {report.products.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Tanlangan davrda mahsulot sotilmagan.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b border-surface-600 text-xs uppercase text-slate-500"><th className="px-2 py-2">Mahsulot</th><th className="px-2 py-2 text-right">Dona</th><th className="px-2 py-2 text-right">Tushum</th><th className="px-2 py-2 text-right">Tannarx</th><th className="px-2 py-2 text-right">Yalpi foyda</th></tr></thead><tbody>{report.products.map((item) => <tr key={item.id} className="border-b border-surface-700/70 last:border-0"><td className="max-w-[160px] truncate px-2 py-3 text-slate-200">{item.name}</td><td className="px-2 py-3 text-right text-slate-300">{formatCount(item.quantity)}</td><td className="px-2 py-3 text-right text-slate-300">{formatSom(item.revenue)}</td><td className="px-2 py-3 text-right text-slate-400">{formatSom(item.cost)}</td><td className={`px-2 py-3 text-right font-semibold ${item.profit >= 0 ? 'text-success-400' : 'text-danger-400'}`}>{formatSom(item.profit)}</td></tr>)}</tbody></table></div>}
        </Panel>

        <Panel title="Operator va rahbar kesimida" icon={<BarChart3 className="h-5 w-5" />}>
          {report.staff.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Tanlangan davrda mas'ul biriktirilgan amal yo'q.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead><tr className="border-b border-surface-600 text-xs uppercase text-slate-500"><th className="px-2 py-2">Mas'ul</th><th className="px-2 py-2 text-right">Amal</th><th className="px-2 py-2 text-right">Sotilgan dona</th><th className="px-2 py-2 text-right">Kirim</th><th className="px-2 py-2 text-right">Chiqim</th></tr></thead><tbody>{report.staff.map((item) => <tr key={item.key} className="border-b border-surface-700/70 last:border-0"><td className="px-2 py-3 text-slate-200">{item.name}<span className="block text-[10px] text-slate-500">{item.role === 'operator' ? 'Operator' : item.role === 'manager' ? 'Rahbar' : 'Eski yozuv'}</span></td><td className="px-2 py-3 text-right text-slate-300">{formatCount(item.operations)}</td><td className="px-2 py-3 text-right text-slate-300">{formatCount(item.salesUnits)}</td><td className="px-2 py-3 text-right text-success-400">{formatSom(item.cashIn)}</td><td className="px-2 py-3 text-right text-warning-400">{formatSom(item.cashOut)}</td></tr>)}</tbody></table></div>}
        </Panel>
      </div>

      <RecentOperations transactions={report.transactions} query="" />
    </div>}
  </main>;
}
