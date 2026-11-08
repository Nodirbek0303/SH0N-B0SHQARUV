import { ArrowDown, ArrowUp, Box, PackageCheck, ShoppingBag } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { formatCount, formatSom } from '@/lib/format';
import type { DashboardStats } from '@/lib/dashboardStats';
import type { Product } from '@/types/club';

interface ProductInsightsProps { products: Product[]; stats: DashboardStats }

export function ProductInsights({ products, stats }: ProductInsightsProps) {
  const unknownSales = stats.productSales.find((item) => item.name === 'Noma’lum mahsulot');
  const ranked = stats.productSales.filter((item) => item !== unknownSales).slice(0, 5);
  const depleted = [...products].sort((a, b) => a.stock - b.stock).slice(0, 5);
  const SalesArrow = (stats.trends.sales ?? 0) >= 0 ? ArrowUp : ArrowDown;
  const StockArrow = (stats.trends.stock ?? 0) >= 0 ? ArrowUp : ArrowDown;

  return <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
    <Panel title="Eng ko‘p sotilgan mahsulotlar" icon={<ShoppingBag className="h-5 w-5" />} action={<span className={`flex items-center gap-1 text-xs ${(stats.trends.sales ?? 0) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>{stats.trends.sales === null ? 'Oldingi davrda ma’lumot yo‘q' : <><SalesArrow className="h-3.5 w-3.5" />{Math.abs(stats.trends.sales)}% haftalik</>}</span>}>
      <p className="mb-4 text-xs text-slate-500">Sotilgan dona soni, savdo ulushi va tushum</p>
      {ranked.length ? <ol className="space-y-3">{ranked.map((item, index) => <li key={item.name} className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-sm font-bold text-brand-300">{index + 1}</span>
        <div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-sm"><span className="truncate font-medium text-slate-100">{item.name}</span><span className="shrink-0 text-slate-300">{formatCount(item.quantity)} dona · {item.share}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-700"><div className="h-full rounded-full bg-brand-400" style={{ width: `${Math.max(item.share, 2)}%` }} /></div></div>
        <span className="hidden text-right text-xs text-slate-400 sm:block">{formatSom(item.revenue)}</span>
      </li>)}</ol> : <p className="py-8 text-center text-sm text-slate-500">Hozircha mahsulot nomi bilan sotuv yo‘q</p>}
      {unknownSales && <p className="mt-3 text-xs text-warning-400">Eski {formatCount(unknownSales.quantity)} ta savdoda mahsulot nomi yo‘q.</p>}
    </Panel>
    <Panel title="Mahsulotlar va qoldiq" icon={<Box className="h-5 w-5" />} action={<span className={`flex items-center gap-1 text-xs ${(stats.trends.stock ?? 0) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>{stats.trends.stock === null ? 'Oldingi davrda ma’lumot yo‘q' : <><StockArrow className="h-3.5 w-3.5" />{Math.abs(stats.trends.stock)}% haftalik</>}</span>}>
      <div className="mb-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-surface-900/70 p-3"><p className="text-lg font-bold text-slate-100">{formatCount(stats.stock.units)}</p><p className="text-[11px] text-slate-500">Qoldiq, dona</p></div><div className="rounded-xl bg-surface-900/70 p-3"><p className="truncate text-sm font-bold text-slate-100">{formatSom(stats.stock.value)}</p><p className="text-[11px] text-slate-500">Sotuv narxidagi qoldiq</p></div><div className="rounded-xl bg-surface-900/70 p-3"><p className="text-lg font-bold text-warning-400">{stats.stock.low + stats.stock.out}</p><p className="text-[11px] text-slate-500">Kam yoki tugagan</p></div></div>
      {depleted.length ? <ul className="divide-y divide-surface-700/70">{depleted.map((product) => <li key={product.id} className="flex items-center justify-between gap-3 py-2.5"><span className="flex min-w-0 items-center gap-2 text-sm text-slate-200"><PackageCheck className="h-4 w-4 shrink-0 text-slate-500" /><span className="truncate">{product.name}</span></span><span className={`shrink-0 text-sm font-semibold ${product.stock === 0 ? 'text-danger-400' : product.stock < 10 ? 'text-warning-400' : 'text-slate-400'}`}>{product.stock === 0 ? 'Tugagan' : `${formatCount(product.stock)} dona`}</span></li>)}</ul> : <p className="py-8 text-center text-sm text-slate-500">Mahsulotlar ro‘yxati bo‘sh</p>}
    </Panel>
  </div>;
}
