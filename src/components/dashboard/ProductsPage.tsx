import { useState } from 'react';
import { Loader2, Package, RefreshCw } from 'lucide-react';
import { ProductManager } from '@/components/dashboard/ProductManager';
import { ProductMovementModal } from '@/components/dashboard/ProductMovementModal';
import { ProductStock } from '@/components/dashboard/ProductStock';
import { useClubData } from '@/hooks/useClubData';
import type { Product, TransactionKind } from '@/types/club';

type ProductAction = Extract<TransactionKind, 'sale' | 'purchase' | 'stock_opening'>;

export function ProductsPage() {
  const { data, error, isLoading, isRefreshing, reload, addProductMovement, saveProduct } = useClubData();
  const [action, setAction] = useState<ProductAction | null>(null);
  const [initialProduct, setInitialProduct] = useState<Product | null>(null);
  const openAction = (nextAction: ProductAction, product: Product | null = null) => {
    setInitialProduct(product);
    setAction(nextAction);
  };
  const closeAction = () => {
    setAction(null);
    setInitialProduct(null);
  };

  return <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-6">
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">SHON CLUB | SAVDO VA OMBOR</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-50"><Package className="h-6 w-6 text-brand-400" />Mahsulotlar</h1>
        <p className="mt-1 text-sm text-slate-400">Mahsulot qo‘shing yoki tahrirlang, sotuv va ombor harakatlarini kiriting.</p>
      </div>
      {data && <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => openAction('sale')} className="rounded-xl bg-success-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-success-500">+ Sotuv</button>
        <button type="button" onClick={() => openAction('stock_opening')} className="rounded-xl border border-surface-600 bg-surface-800 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-surface-700">+ Omborga kirim</button>
        <button type="button" onClick={() => openAction('purchase')} className="rounded-xl border border-surface-600 bg-surface-800 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-surface-700">+ Tovar xaridi</button>
      </div>}
    </header>
    {isLoading && <div className="flex items-center justify-center gap-3 py-24 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" />Mahsulotlar yuklanmoqda...</div>}
    {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-300"><span>{error}</span><button type="button" onClick={reload} disabled={isRefreshing} className="flex items-center gap-2 rounded-lg bg-surface-700 px-3 py-2 font-semibold text-slate-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />Qayta yuklash</button></div>}
    {data && <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
      <ProductStock products={data.products} />
      <ProductManager products={data.products} onSave={saveProduct} onStockIn={(product) => openAction('stock_opening', product)} />
    </div>}
    {action && data && <ProductMovementModal kind={action} products={data.products} initialProductId={initialProduct?.id} onSubmit={addProductMovement} onClose={closeAction} />}
  </main>;
}
