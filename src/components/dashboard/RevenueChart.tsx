import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { formatCompact, formatSom } from '@/lib/format';
import type { DashboardStats } from '@/lib/dashboardStats';

interface RevenueChartProps { week: DashboardStats['week']; incomeChange: number | null }
const WIDTH = 640;
const HEIGHT = 260;
const PAD = { top: 16, right: 24, bottom: 36, left: 56 };
const TICKS = 4;
const niceCeil = (value: number) => { if (value <= 0) return 1; const magnitude = 10 ** Math.floor(Math.log10(value)); return Math.ceil(value / magnitude) * magnitude; };

export function RevenueChart({ week, incomeChange }: RevenueChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const yMax = niceCeil(Math.max(...week.income, ...week.expense));
  const totalIncome = week.income.reduce((sum, value) => sum + value, 0);
  const totalExpense = week.expense.reduce((sum, value) => sum + value, 0);
  const xFor = (index: number) => PAD.left + (index * innerWidth) / (week.labels.length - 1);
  const yFor = (value: number) => PAD.top + innerHeight * (1 - value / yMax);
  const linePath = (values: number[]) => values.map((value, index) => `${index === 0 ? 'M' : 'L'}${xFor(index).toFixed(1)},${yFor(value).toFixed(1)}`).join(' ');
  const incomeLine = linePath(week.income);
  const incomeArea = `${incomeLine} L${xFor(6).toFixed(1)},${PAD.top + innerHeight} L${xFor(0).toFixed(1)},${PAD.top + innerHeight} Z`;
  const expenseLine = linePath(week.expense);
  const tickValues = Array.from({ length: TICKS + 1 }, (_, index) => (yMax / TICKS) * index);

  return <Panel title="Daromad va xarajatlar" icon={<BarChart3 className="h-5 w-5" />} action={<div className="flex items-center gap-3 text-xs text-slate-300"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-brand-400" />Kirim</span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-warning-400" />Chiqim</span></div>} className="xl:col-span-2">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"><span>Bu hafta kirim: <b className="text-slate-100">{formatSom(totalIncome)}</b> - chiqim: <b className="text-slate-100">{formatSom(totalExpense)}</b></span><span className={incomeChange === null ? 'text-slate-500' : incomeChange >= 0 ? 'text-success-400' : 'text-danger-400'}>{incomeChange === null ? 'Oldingi davrda ma’lumot yo‘q' : `${incomeChange >= 0 ? '↑' : '↓'} ${Math.abs(incomeChange)}% o‘tgan haftaning shu davriga nisbatan`}</span></div>
    <div className="relative"><svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-56 w-full overflow-visible sm:h-64" role="img" aria-label="Haftalik daromad va xarajatlar grafigi"><defs><linearGradient id="income-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4D9BFF" stopOpacity="0.35" /><stop offset="100%" stopColor="#4D9BFF" stopOpacity="0" /></linearGradient></defs>
      {tickValues.map((value) => <g key={value}><line x1={PAD.left} x2={WIDTH - PAD.right} y1={yFor(value)} y2={yFor(value)} className="stroke-surface-600" strokeDasharray="4 6" /><text x={PAD.left - 12} y={yFor(value) + 4} textAnchor="end" className="fill-slate-500 text-[11px]">{formatCompact(value)}</text></g>)}
      {week.labels.map((label, index) => <text key={label} x={xFor(index)} y={HEIGHT - 8} textAnchor="middle" className="fill-slate-400 text-[11px]">{label.slice(0, 3)}</text>)}
      <path d={incomeArea} fill="url(#income-area)" /><path d={incomeLine} fill="none" stroke="#4D9BFF" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" /><path d={expenseLine} fill="none" stroke="#FFA726" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {week.labels.map((label, index) => <g key={label}><rect x={xFor(index) - innerWidth / 14} y={PAD.top} width={innerWidth / 7} height={innerHeight} fill="transparent" tabIndex={0} role="button" aria-label={`${label}: kirim ${formatSom(week.income[index])}, chiqim ${formatSom(week.expense[index])}, savdo ${week.saleCount[index]} dona`} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} /><circle cx={xFor(index)} cy={yFor(week.income[index])} r={hovered === index ? 6 : 4} className="fill-brand-400 stroke-surface-800" strokeWidth={2} /><circle cx={xFor(index)} cy={yFor(week.expense[index])} r={hovered === index ? 6 : 4} className="fill-warning-400 stroke-surface-800" strokeWidth={2} /></g>)}
    </svg>
    {hovered !== null && <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-lg border border-surface-600 bg-surface-900/95 px-3 py-2 text-xs shadow-xl sm:left-1/2"><p className="mb-1 font-semibold text-slate-100">{week.labels[hovered]}</p><p className="text-brand-300">Kirim: {formatSom(week.income[hovered])}</p><p className="text-warning-400">Chiqim: {formatSom(week.expense[hovered])}</p><p className="text-success-400">Sotuvlar: {week.saleCount[hovered]} dona - {formatSom(week.sales[hovered])}</p></div>}</div>
  </Panel>;
}
