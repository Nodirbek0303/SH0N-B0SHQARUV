import { Box } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { formatCount, formatSom } from '@/lib/format';
import type { Product } from '@/types/club';

interface ProductStockProps {
  products: Product[];
}

const stockTone = (stock: number) => {
  if (stock === 0) return 'text-danger-400';
  if (stock < 10) return 'text-warning-400';
  return 'text-slate-400';
};

export function ProductStock({ products }: ProductStockProps) {
  return (
    <Panel title="Tovarlar qoldig'i" icon={<Box className="h-5 w-5" strokeWidth={1.75} />}>
      {products.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Tovarlar hali qo'shilmagan</p>
      ) : (
        <ul className="flex flex-col divide-y divide-surface-700/70">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-700 text-sm font-bold text-brand-300">
                  {product.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">{product.name}</p>
                  <p className={`text-xs ${stockTone(product.stock)}`}>{formatCount(product.stock)} dona</p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold text-slate-100">{formatSom(product.price)}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
