import { useCallback, useEffect, useRef, useState } from 'react';
import type { CashMovementKind, Computer, ComputerSession, ComputerStatus, Product, Transaction, TransactionActor, TransactionKind } from '@/types/club';
import { DEFAULT_COMPUTERS, STARTER_PRODUCTS } from '@/lib/clubDefaults';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSupabaseClubData } from '@/hooks/useSupabaseClubData';

export interface ClubData { transactions: Transaction[]; products: Product[]; computers: Computer[]; computerSessions: ComputerSession[] }

const STORAGE_KEY = 'shon-club-local-data-v2-empty';
const DEFAULT_DATA: ClubData = {
  transactions: [],
  products: STARTER_PRODUCTS,
  computers: DEFAULT_COMPUTERS,
  computerSessions: [],
};

const TRANSACTION_KINDS: TransactionKind[] = ['session', 'sale', 'purchase', 'expense', 'cash_in', 'cash_out', 'stock_opening', 'stock_adjustment'];
const COMPUTER_STATUSES: ComputerStatus[] = ['free', 'busy', 'broken'];
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isSafeNonNegativeInteger = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

function assertSafeInventory(products: Product[]) {
  const totals = products.reduce((sum, product) => ({
    cost: sum.cost + BigInt(product.cost_price) * BigInt(product.stock),
    retail: sum.retail + BigInt(product.price) * BigInt(product.stock),
    units: sum.units + BigInt(product.stock),
  }), { cost: 0n, retail: 0n, units: 0n });
  if (totals.cost > MAX_SAFE_BIGINT || totals.retail > MAX_SAFE_BIGINT || totals.units > MAX_SAFE_BIGINT) throw new Error('Ombor qiymati yoki miqdori xavfsiz hisob chegarasidan oshdi.');
}

function assertSafeLedger(transactions: Transaction[]) {
  const totals = transactions.reduce((sum, item) => ({
    incoming: sum.incoming + (item.kind === 'session' || item.kind === 'sale' || item.kind === 'cash_in' ? BigInt(item.amount) : 0n),
    outgoing: sum.outgoing + (item.kind === 'purchase' || item.kind === 'expense' || item.kind === 'cash_out' ? BigInt(item.amount) : 0n),
    income: sum.income + (item.kind === 'session' || item.kind === 'sale' ? BigInt(item.amount) : 0n),
    costOfSales: sum.costOfSales + (item.kind === 'sale' ? BigInt(item.unit_cost ?? 0) * BigInt(item.quantity ?? 1) : 0n),
    operatingExpense: sum.operatingExpense + (item.kind === 'expense' ? BigInt(item.amount) : 0n),
    sold: sum.sold + (item.kind === 'sale' ? BigInt(item.quantity ?? 1) : 0n),
  }), { incoming: 0n, outgoing: 0n, income: 0n, costOfSales: 0n, operatingExpense: 0n, sold: 0n });
  const cashFlow = totals.incoming - totals.outgoing;
  const profit = totals.income - totals.costOfSales - totals.operatingExpense;
  if (totals.incoming + totals.outgoing > MAX_SAFE_BIGINT || totals.costOfSales > MAX_SAFE_BIGINT || totals.sold > MAX_SAFE_BIGINT || cashFlow > MAX_SAFE_BIGINT || cashFlow < -MAX_SAFE_BIGINT || profit > MAX_SAFE_BIGINT || profit < -MAX_SAFE_BIGINT) throw new Error('Hisob-kitoblar xavfsiz hisob chegarasidan oshdi.');
  calculateCashBalance(transactions);
}

function readData(): ClubData {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.removeItem('shon-club-local-data-v1');
    return DEFAULT_DATA;
  }
  const parsed: unknown = JSON.parse(saved);
  if (!isRecord(parsed) || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.products) || !Array.isArray(parsed.computers)) return DEFAULT_DATA;

  const transactions = parsed.transactions.filter((value): value is Transaction => isRecord(value)
    && typeof value.id === 'string'
    && TRANSACTION_KINDS.includes(value.kind as TransactionKind)
    && typeof value.title === 'string'
    && typeof value.detail === 'string'
    && isSafeNonNegativeInteger(value.amount)
    && typeof value.created_at === 'string'
    && Number.isFinite(Date.parse(value.created_at))
    && (value.product_id === undefined || value.product_id === null || typeof value.product_id === 'string')
    && (value.quantity === undefined || value.quantity === null || value.kind === 'stock_adjustment' && Number.isSafeInteger(value.quantity) || isSafeNonNegativeInteger(value.quantity))
    && (value.unit_price === undefined || value.unit_price === null || isSafeNonNegativeInteger(value.unit_price))
    && (value.unit_cost === undefined || value.unit_cost === null || isSafeNonNegativeInteger(value.unit_cost)));
  const products = parsed.products.filter((value): value is Product => isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && value.name.trim().length > 0
    && isSafeNonNegativeInteger(value.price)
    && (value.cost_price === undefined || isSafeNonNegativeInteger(value.cost_price))
    && isSafeNonNegativeInteger(value.stock))
    .map((product) => ({ ...product, cost_price: product.cost_price ?? product.price })) as Product[];
  const computers = parsed.computers.filter((value): value is Computer => isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && COMPUTER_STATUSES.includes(value.status as ComputerStatus)
    && (value.total_runtime_seconds === undefined || isSafeNonNegativeInteger(value.total_runtime_seconds)))
    .map((computer) => ({ ...computer, total_runtime_seconds: computer.total_runtime_seconds ?? 0 }));
  const computerSessions = (Array.isArray(parsed.computerSessions) ? parsed.computerSessions : []).filter((value): value is ComputerSession => isRecord(value)
    && typeof value.id === 'string'
    && typeof value.computer_id === 'string'
    && typeof value.started_at === 'string'
    && Number.isFinite(Date.parse(value.started_at))
    && (value.ended_at === null || typeof value.ended_at === 'string' && Number.isFinite(Date.parse(value.ended_at)))
    && (value.duration_seconds === null || isSafeNonNegativeInteger(value.duration_seconds)));
  if (transactions.length !== parsed.transactions.length || products.length !== parsed.products.length || computers.length !== parsed.computers.length || (Array.isArray(parsed.computerSessions) && computerSessions.length !== parsed.computerSessions.length)) {
    throw new Error('Mahalliy yozuvlardan biri buzilgan. Xatolik sababini tuzatishdan oldin brauzer ma\'lumotlarini tozalamang.');
  }
  const hydratedProducts = products.length ? [...products] : [...STARTER_PRODUCTS];
  const productIds = new Set(hydratedProducts.map((product) => product.id));
  const productNames = new Set(hydratedProducts.map((product) => product.name.trim().toLowerCase()));
  for (const starter of STARTER_PRODUCTS) {
    if (!productIds.has(starter.id) && !productNames.has(starter.name.trim().toLowerCase())) {
      hydratedProducts.push(starter);
      productIds.add(starter.id);
      productNames.add(starter.name.trim().toLowerCase());
    }
  }
  const hydratedComputers = computers.length ? [...computers] : [...DEFAULT_DATA.computers];
  if (hydratedComputers.length > 0 && hydratedComputers.length < 25) {
    const computerIds = new Set(hydratedComputers.map((computer) => computer.id));
    const computerNames = new Set(hydratedComputers.map((computer) => computer.name.trim().toLowerCase()));
    const missing = DEFAULT_DATA.computers.filter((computer) => !computerIds.has(computer.id) && !computerNames.has(computer.name.toLowerCase()));
    hydratedComputers.push(...missing.slice(0, 25 - hydratedComputers.length));
  }
  const knownComputerIds = new Set(hydratedComputers.map((computer) => computer.id));
  const allIds = [...transactions, ...hydratedProducts, ...hydratedComputers, ...computerSessions].map((item) => item.id);
  if (new Set(allIds).size !== allIds.length || new Set(hydratedProducts.map((item) => item.name.trim().toLowerCase())).size !== hydratedProducts.length || computerSessions.some((session) => !knownComputerIds.has(session.computer_id))) throw new Error('Takrorlangan ID, mahsulot nomi yoki noto\'g\'ri kompyuter seansi bor.');
  const sessions = [...computerSessions];
  const normalizedComputers = hydratedComputers.map((computer) => {
    const activeIndexes = sessions.flatMap((session, index) => session.computer_id === computer.id && session.ended_at === null ? [index] : []);
    if (activeIndexes.length > 1) throw new Error('Bitta kompyuter uchun bir nechta faol seans topildi.');
    let totalRuntime = computer.total_runtime_seconds ?? 0;
    if (computer.status === 'busy' && activeIndexes.length === 0) sessions.push({ id: crypto.randomUUID(), computer_id: computer.id, started_at: new Date().toISOString(), ended_at: null, duration_seconds: null });
    if (computer.status !== 'busy' && activeIndexes.length === 1) {
      const index = activeIndexes[0];
      const active = sessions[index];
      const endedAt = new Date();
      const duration = Math.max(0, Math.floor((endedAt.getTime() - Date.parse(active.started_at)) / 1000));
      sessions[index] = { ...active, ended_at: endedAt.toISOString(), duration_seconds: duration };
      totalRuntime += duration;
    }
    return { ...computer, total_runtime_seconds: totalRuntime };
  });
  const normalized = { transactions, products: hydratedProducts, computers: normalizedComputers, computerSessions: sessions };
  assertSafeLedger(normalized.transactions);
  assertSafeInventory(normalized.products);
  return normalized;
}

function writeData(data: ClubData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function makeTransaction(values: Omit<Transaction, 'id' | 'created_at'>): Transaction {
  return { ...values, id: crypto.randomUUID(), created_at: new Date().toISOString() };
}

function validateActor(actor: TransactionActor) {
  const name = actor.name.trim();
  if (!name || name.length > 60 || (actor.role !== 'operator' && actor.role !== 'manager')) throw new Error('Masulning turi va ismini kiriting.');
  return { handled_by: name, handled_as: actor.role } as const;
}

function calculateCashBalance(transactions: Transaction[]) {
  const balance = transactions.reduce((total, item) => {
    const incoming = item.kind === 'session' || item.kind === 'sale' || item.kind === 'cash_in';
    const outgoing = item.kind === 'purchase' || item.kind === 'expense' || item.kind === 'cash_out';
    return incoming ? total + BigInt(item.amount) : outgoing ? total - BigInt(item.amount) : total;
  }, 0n);
  if (balance > MAX_SAFE_BIGINT || balance < -MAX_SAFE_BIGINT) throw new Error('Kassa balansi xavfsiz hisob chegarasidan oshdi.');
  return Number(balance);
}

function useLocalClubData(enabled: boolean) {
  const [data, setData] = useState<ClubData | null>(null);
  const dataRef = useRef<ClubData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const next = readData();
      writeData(next);
      dataRef.current = next;
      setData(next);
      setError(null);
      return true;
    } catch {
      setError('Brauzer xotirasini o\'qib yoki saqlab bo\'lmadi. Xotira uchun joy va maxfiy rejim sozlamalarini tekshiring.');
      return false;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { if (enabled) void load(); }, [enabled, load]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!enabled || event.key !== STORAGE_KEY) return;
      try {
        const next = readData();
        dataRef.current = next;
        setData(next);
        setError(null);
      } catch {
        setError('Boshqa oynadagi mahalliy ma\'lumotlarni o\'qib bo\'lmadi.');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [enabled]);

  const update = useCallback((transform: (current: ClubData) => ClubData) => {
    const current = dataRef.current;
    if (!current) throw new Error('Ma\'lumotlar hali yuklanmadi. Sahifani yangilang.');
    const next = transform(current);
    assertSafeLedger(next.transactions);
    assertSafeInventory(next.products);
    writeData(next);
    dataRef.current = next;
    setData(next);
  }, []);

  const requireFunds = useCallback((amount: number) => {
    const current = dataRef.current;
    if (!current || calculateCashBalance(current.transactions) < amount) throw new Error('Kassada mablag\' yetarli emas. Avval pul kirimini yozing.');
  }, []);

  const addCashMovement = useCallback(async (kind: CashMovementKind, amount: number, note: string, actor: TransactionActor) => {
    if (kind === 'cash_out') requireFunds(amount);
    update((current) => ({ ...current, transactions: [makeTransaction({ kind, title: kind === 'cash_in' ? 'Pul kiritish' : 'Pul olish', detail: note, amount, ...validateActor(actor) }), ...current.transactions] }));
  }, [requireFunds, update]);

  const addTransaction = useCallback(async (kind: Extract<TransactionKind, 'session' | 'expense'>, amount: number, note: string, actor: TransactionActor) => {
    if (kind === 'expense') requireFunds(amount);
    update((current) => ({ ...current, transactions: [makeTransaction({ kind, title: kind === 'session' ? 'Seans tushumi' : 'Xarajat', detail: note, amount, ...validateActor(actor) }), ...current.transactions] }));
  }, [requireFunds, update]);

  const addProductMovement = useCallback(async (kind: Extract<TransactionKind, 'sale' | 'purchase' | 'stock_opening'>, product: Product, quantity: number, actor: TransactionActor) => {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Miqdorni musbat butun son kiriting.');
    const current = dataRef.current?.products.find((item) => item.id === product.id);
    if (!current) throw new Error('Mahsulot topilmadi. Sahifani yangilang.');
    const unitPrice = kind === 'sale' ? current.price : current.cost_price;
    if (kind !== 'stock_opening' && unitPrice <= 0) throw new Error(kind === 'sale' ? 'Sotuv narxini mahsulot sozlamasida kiriting.' : 'Tovar tannarxini mahsulot sozlamasida kiriting.');
    const amount = kind === 'stock_opening' ? 0 : unitPrice * quantity;
    if (!Number.isSafeInteger(amount)) throw new Error('Umumiy summa xavfsiz hisob chegarasidan oshib ketdi.');
    if (kind === 'sale' && current.stock < quantity) throw new Error('Omborda bu miqdor uchun mahsulot yetarli emas.');
    if (kind === 'purchase') {
      requireFunds(amount);
    }
    if (current.stock + quantity > 2_147_483_647) throw new Error('Mahsulot qoldig\'i ruxsat etilgan chegaradan oshib ketadi.');
    update((latest) => ({
      ...latest,
      products: latest.products.map((item) => item.id === current.id ? { ...item, stock: item.stock + (kind === 'sale' ? -quantity : quantity) } : item),
      transactions: [makeTransaction({
        kind,
        title: `${kind === 'sale' ? 'Sotuv' : kind === 'purchase' ? 'Xarid' : 'Omborga kirim'}: ${current.name}`,
        detail: current.name,
        amount,
        product_id: current.id,
        quantity,
        ...(kind !== 'stock_opening' ? { unit_price: unitPrice } : {}),
        ...(kind === 'sale' || kind === 'stock_opening' ? { unit_cost: current.cost_price } : {}),
        ...validateActor(actor),
      }), ...latest.transactions],
    }));
  }, [requireFunds, update]);

  const saveProduct = useCallback(async (product: Pick<Product, 'name' | 'price' | 'cost_price' | 'stock'>, id: string | undefined, actor: TransactionActor) => {
    if (!product.name.trim() || product.name.trim().length > 100
      || !Number.isSafeInteger(product.price) || product.price < 1
      || !Number.isSafeInteger(product.cost_price) || product.cost_price < 1
      || !Number.isSafeInteger(product.stock) || product.stock < 0 || product.stock > 2_147_483_647) {
      throw new Error('Mahsulot nomi, narxlari yoki dona miqdorini tekshiring.');
    }
    if (dataRef.current?.products.some((item) => item.name.trim().toLowerCase() === product.name.trim().toLowerCase() && item.id !== id)) throw new Error('Bu nomdagi mahsulot allaqachon mavjud.');
    const productId = id ?? crypto.randomUUID();
    update((current) => ({
      ...current,
      products: id
        ? current.products.map((item) => item.id === id ? { ...item, ...product, name: product.name.trim() } : item)
        : [...current.products, { ...product, name: product.name.trim(), id: productId }],
      transactions: !id && product.stock > 0
        ? [makeTransaction({ kind: 'stock_opening', title: `Boshlang'ich qoldiq: ${product.name.trim()}`, detail: product.name.trim(), amount: 0, product_id: productId, quantity: product.stock, unit_cost: product.cost_price, ...validateActor(actor) }), ...current.transactions]
        : id && current.products.find((item) => item.id === id)?.stock !== product.stock
          ? [makeTransaction({
            kind: 'stock_adjustment',
            title: `Qoldiq tahriri: ${product.name.trim()}`,
            detail: product.name.trim(),
            amount: 0,
            product_id: productId,
            quantity: product.stock - (current.products.find((item) => item.id === id)?.stock ?? 0),
            unit_cost: product.cost_price,
            ...validateActor(actor),
          }), ...current.transactions]
          : current.transactions,
    }));
  }, [update]);

  const setComputerStatus = useCallback(async (id: string, status: ComputerStatus) => {
    update((current) => {
      const computer = current.computers.find((item) => item.id === id);
      if (!computer || computer.status === status) return current;
      const now = new Date();
      const sessions = [...current.computerSessions];
      let totalRuntime = computer.total_runtime_seconds ?? 0;
      if (status === 'busy') sessions.push({ id: crypto.randomUUID(), computer_id: id, started_at: now.toISOString(), ended_at: null, duration_seconds: null });
      if (computer.status === 'busy') {
        const activeIndex = sessions.findIndex((session) => session.computer_id === id && session.ended_at === null);
        if (activeIndex >= 0) {
          const active = sessions[activeIndex];
          const duration = Math.max(0, Math.floor((now.getTime() - Date.parse(active.started_at)) / 1000));
          sessions[activeIndex] = { ...active, ended_at: now.toISOString(), duration_seconds: duration };
          totalRuntime += duration;
        }
      }
      return {
        ...current,
        computerSessions: sessions,
        computers: current.computers.map((item) => item.id === id ? { ...item, status, total_runtime_seconds: totalRuntime } : item),
      };
    });
  }, [update]);

  const addComputer = useCallback(async (name: string) => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 60) throw new Error('Kompyuter nomini 1-60 belgi oraligida kiriting.');
    if (dataRef.current?.computers.some((computer) => computer.name.trim().toLowerCase() === cleanName.toLowerCase())) throw new Error('Bu nomdagi kompyuter allaqachon mavjud.');
    update((current) => ({ ...current, computers: [...current.computers, { id: crypto.randomUUID(), name: cleanName, status: 'free', total_runtime_seconds: 0 }] }));
  }, [update]);

  return { data, error, isLoading, isRefreshing, reload: load, addCashMovement, addTransaction, addProductMovement, saveProduct, setComputerStatus, addComputer };
}

export function useClubData() {
  const localData = useLocalClubData(!isSupabaseConfigured);
  const remoteData = useSupabaseClubData(isSupabaseConfigured);
  return isSupabaseConfigured ? remoteData : localData;
}
