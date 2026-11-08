import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { formatSom } from '@/lib/format';
import type { Product, TransactionKind } from '@/types/club';
import type { StaffRole } from '@/types/club';
import { TransactionActorFields } from '@/components/dashboard/TransactionActorFields';

interface Props {
  kind: Extract<TransactionKind, 'sale' | 'purchase' | 'stock_opening'>;
  products: Product[];
  initialProductId?: string;
  onSubmit: (kind: Props['kind'], product: Product, quantity: number, actor: { name: string; role: Exclude<StaffRole, 'unknown'> }) => Promise<void>;
  onClose: () => void;
}

export function ProductMovementModal({ kind, products, initialProductId, onSubmit, onClose }: Props) {
  const [productId, setProductId] = useState(initialProductId ?? products[0]?.id ?? '');
  const [quantityText, setQuantityText] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actorName, setActorName] = useState('');
  const [actorRole, setActorRole] = useState<Exclude<StaffRole, 'unknown'>>('operator');
  const product = products.find((item) => item.id === productId);
  const quantity = Number(quantityText);
  const sale = kind === 'sale';
  const intake = kind === 'stock_opening';
  const maxQuantity = product ? (sale ? product.stock : 2_147_483_647 - product.stock) : 0;
  const unitPrice = product ? (sale ? product.price : product.cost_price) : 0;
  const total = unitPrice * (Number.isSafeInteger(quantity) ? quantity : 0);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [saving, onClose]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > maxQuantity || !Number.isSafeInteger(total)) {
      setError('Miqdor, summa yoki mahsulot qoldigini tekshiring.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(kind, product, quantity, { name: actorName, role: actorRole });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Saqlashda xatolik yuz berdi.');
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/70 p-4 backdrop-blur-sm" onMouseDown={() => !saving && onClose()}>
    <form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="product-movement-title" className="w-full max-w-md rounded-2xl border border-surface-600 bg-surface-800 p-6 shadow-2xl">
      <header className="mb-5 flex items-center justify-between"><h2 id="product-movement-title" className="flex items-center gap-2 text-lg font-semibold text-slate-100"><ShoppingBag className="h-5 w-5 text-brand-400" />{intake ? 'Omborga kirim' : sale ? 'Mahsulot sotish' : 'Mahsulot xaridi'}</h2><button type="button" onClick={() => !saving && onClose()} disabled={saving} aria-label="Yopish"><X className="h-5 w-5 text-slate-400" /></button></header>
      {products.length === 0 ? <p className="rounded-xl bg-warning-400/10 p-4 text-sm text-warning-400">Avval mahsulotlar bo'limiga mahsulot qo'shing.</p> : <label className="mb-4 flex flex-col gap-2 text-sm text-slate-300">Mahsulot<select value={productId} onChange={(event) => setProductId(event.target.value)} className="rounded-xl border border-surface-600 bg-surface-900 px-4 py-3 text-slate-100">{products.map((item) => <option key={item.id} value={item.id}>{item.name} | qoldiq {item.stock} dona</option>)}</select></label>}
      <label className="mb-4 flex flex-col gap-2 text-sm text-slate-300">{intake ? 'Kirim miqdori (dona)' : 'Miqdor (dona)'}<input type="number" min="1" max={maxQuantity} step="1" value={quantityText} onChange={(event) => setQuantityText(event.target.value)} className="rounded-xl border border-surface-600 bg-surface-900 px-4 py-3 text-slate-100" /></label>
      {product && maxQuantity === 0 && <p className="mb-3 text-xs text-warning-400">{sale ? 'Omborda mahsulot qolmagan. Sotishdan oldin kirim yozing.' : 'Ombor miqdori ruxsat etilgan eng yuqori chegaraga yetgan.'}</p>}
      <div className="rounded-xl bg-surface-900/80 p-4 text-sm"><div className="flex justify-between text-slate-400"><span>{intake ? 'Kirim tannarxi (kassaga ta’sir qilmaydi)' : sale ? 'Sotuv summasi' : 'Xarid tannarxi'}</span><span className="font-semibold text-slate-100">{formatSom(Number.isSafeInteger(total) ? total : 0)}</span></div><div className="mt-2 flex justify-between text-slate-400"><span>Yangi qoldiq</span><span className="text-slate-200">{product && Number.isSafeInteger(quantity) ? product.stock + (sale ? -quantity : quantity) : product?.stock ?? 0} dona</span></div></div>
      {!intake && product && unitPrice === 0 && <p className="mt-3 text-xs text-warning-400">Avval mahsulot sozlamasida {sale ? 'sotuv narxini' : 'tannarxini'} kiriting.</p>}
      <div className="mt-4"><TransactionActorFields name={actorName} role={actorRole} onNameChange={setActorName} onRoleChange={setActorRole} /></div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-danger-500/10 px-3 py-2 text-sm text-danger-400">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => !saving && onClose()} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:bg-surface-700">Bekor qilish</button><button type="submit" disabled={saving || products.length === 0 || (!intake && unitPrice === 0) || maxQuantity === 0} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-400 disabled:opacity-50">{saving ? 'Saqlanmoqda...' : intake ? 'Kirimni saqlash' : sale ? 'Sotuvni saqlash' : 'Xaridni saqlash'}</button></div>
    </form>
  </div>;
}
