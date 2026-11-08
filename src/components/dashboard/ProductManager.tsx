import { useState } from 'react';
import type { FormEvent } from 'react';
import { Package, PackagePlus, Pencil, Plus, X } from 'lucide-react';
import { TransactionActorFields } from '@/components/dashboard/TransactionActorFields';
import { Panel } from '@/components/ui/Panel';
import { formatCount, formatSom } from '@/lib/format';
import type { Product, StaffRole, TransactionActor } from '@/types/club';

type ProductInput = Pick<Product, 'name' | 'price' | 'cost_price' | 'stock'>;
type Staff = Exclude<StaffRole, 'unknown'>;
interface Props {
  products: Product[];
  onSave: (product: ProductInput, id: string | undefined, actor: TransactionActor) => Promise<void>;
  onStockIn: (product: Product) => void;
}

export function ProductManager({ products, onSave, onStockIn }: Props) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [actorName, setActorName] = useState('');
  const [actorRole, setActorRole] = useState<Staff>('operator');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (product?: Product) => {
    setFormOpen(true);
    setEditing(product ?? null);
    setName(product?.name ?? '');
    setPrice(product?.price ? String(product.price) : '');
    setCostPrice(product?.cost_price ? String(product.cost_price) : '');
    setStock(product ? String(product.stock) : '0');
    setActorName('');
    setActorRole('operator');
    setError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const numericPrice = Number(price);
    const numericCostPrice = Number(costPrice);
    const numericStock = Number(stock);
    if (!cleanName || cleanName.length > 100 || !Number.isSafeInteger(numericPrice) || numericPrice <= 0 || !Number.isSafeInteger(numericCostPrice) || numericCostPrice <= 0 || !Number.isSafeInteger(numericStock) || numericStock < 0 || numericStock > 2_147_483_647) {
      setError('Nom, musbat sotuv narxi, tannarx va dona miqdorini tekshiring.');
      return;
    }
    if (!actorName.trim()) {
      setError('Masul xodim ismini kiriting.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: cleanName, price: numericPrice, cost_price: numericCostPrice, stock: numericStock }, editing?.id, { name: actorName, role: actorRole });
      setFormOpen(false);
      setEditing(null);
      setName('');
      setPrice('');
      setCostPrice('');
      setStock('0');
      setActorName('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Mahsulot saqlanmadi.');
    } finally {
      setSaving(false);
    }
  };

  return <Panel title="Mahsulotlar va ombor" icon={<Package className="h-5 w-5" />} action={<button type="button" onClick={() => startEdit()} className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" /> Yangi</button>}>
    {formOpen && <form onSubmit={submit} className="mb-4 rounded-xl bg-surface-900/70 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input required maxLength={100} autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Mahsulot nomi (masalan, Fanta 1.5L)" className="rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-slate-100 sm:col-span-2" />
        <label className="flex flex-col gap-1 text-xs text-slate-400">Sotuv narxi (so'm)<input required type="number" min="1" max="9007199254740991" step="1" value={price} onChange={(event) => setPrice(event.target.value)} className="rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-slate-100" /></label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">Bir dona tannarxi (so'm)<input required type="number" min="1" max="9007199254740991" step="1" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} className="rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-slate-100" /></label>
        <label className="flex flex-col gap-1 text-xs text-slate-400">{editing ? 'Ombordagi dona soni' : 'Boshlangich ombor miqdori (dona)'}<input required type="number" min="0" max="2147483647" step="1" value={stock} onChange={(event) => setStock(event.target.value)} className="rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-slate-100" /></label>
        <p className="self-end pb-2 text-xs text-slate-500">{editing ? 'Qoldiqdagi farq ombor harakati sifatida qayd etiladi.' : 'Boshlangich qoldiq darhol saqlanadi.'}</p>
      </div>
      <TransactionActorFields name={actorName} role={actorRole} onNameChange={setActorName} onRoleChange={setActorRole} />
      {error && <p role="alert" className="mb-3 text-xs text-danger-400">{error}</p>}
      <div className="flex gap-2"><button disabled={saving} className="rounded-lg bg-success-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button><button type="button" onClick={() => !saving && setFormOpen(false)} aria-label="Bekor qilish" disabled={saving} className="rounded-lg p-2 text-slate-400 hover:bg-surface-700"><X className="h-4 w-4" /></button></div>
    </form>}
    {products.length ? <ul className="divide-y divide-surface-700/70">{products.map((product) => <li key={product.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-100">{product.name}</p><p className="text-xs text-slate-500">Sotuv {formatSom(product.price)} | Tannarx {formatSom(product.cost_price)} | Qoldiq {formatCount(product.stock)} dona</p>{(product.price === 0 || product.cost_price === 0) && <p className="mt-1 text-[11px] text-warning-400">Sotuv va tannarxni kiritish kerak</p>}</div><button type="button" onClick={() => onStockIn(product)} aria-label={`${product.name} omboriga kirim kiritish`} title="Omborga kirim" className="rounded-lg p-2 text-success-400 hover:bg-surface-700"><PackagePlus className="h-4 w-4" /></button><button type="button" onClick={() => startEdit(product)} aria-label={`${product.name} mahsulotini tahrirlash`} className="rounded-lg p-2 text-slate-400 hover:bg-surface-700 hover:text-brand-300"><Pencil className="h-4 w-4" /></button></li>)}</ul> : <p className="py-6 text-center text-sm text-slate-500">Mahsulot qo'shish uchun Yangi tugmasini bosing.</p>}
  </Panel>;
}
