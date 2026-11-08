import { useCallback, useEffect, useState } from 'react';
import type { CashMovementKind, ComputerSession, ComputerStatus, Product, TransactionActor, TransactionKind } from '@/types/club';
import { DEFAULT_COMPUTERS, STARTER_PRODUCTS } from '@/lib/clubDefaults';
import { supabase } from '@/lib/supabase';
import type { ClubData } from '@/hooks/useClubData';

function safeNumber(value: number | string, label: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || Math.abs(parsed) > Number.MAX_SAFE_INTEGER) {
    throw new Error(`${label} xavfsiz hisob chegarasidan oshdi.`);
  }
  return parsed;
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase sozlanmagan. Vercel Environment Variables qiymatlarini tekshiring.');
  return supabase;
}

function checkResult(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

async function getAllPages<Row>(fetchPage: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>) {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await fetchPage(from, from + 999);
    checkResult(error);
    rows.push(...(page ?? []));
    if (!page || page.length < 1000) return rows;
  }
}

export function useSupabaseClubData(enabled: boolean) {
  const [data, setData] = useState<ClubData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return false;
    setIsRefreshing(true);
    try {
      const client = requireSupabase();
      const { error: seedError } = await client.rpc('seed_club_defaults', {
        p_products: STARTER_PRODUCTS.map(({ name, price, cost_price, stock }) => ({ name, price, cost_price, stock })),
        p_computers: DEFAULT_COMPUTERS.map(({ name }) => ({ name })),
      });
      checkResult(seedError);

      const [productRows, computerRows, transactionRows, sessionRows] = await Promise.all([
        getAllPages((from, to) => client.from('products').select('*').order('name').range(from, to)),
        getAllPages((from, to) => client.from('computers').select('*').order('name').range(from, to)),
        getAllPages((from, to) => client.from('transactions').select('*').order('created_at', { ascending: false }).order('id').range(from, to)),
        getAllPages((from, to) => client.from('computer_sessions').select('*').order('started_at', { ascending: false }).order('id').range(from, to)),
      ]);

      const next: ClubData = {
        products: (productRows ?? []).map((product) => ({
          id: product.id,
          name: product.name,
          price: safeNumber(product.price, 'Mahsulot narxi'),
          cost_price: safeNumber(product.cost_price, 'Mahsulot tannarxi'),
          stock: safeNumber(product.stock, 'Mahsulot qoldig‘i'),
        })),
        computers: (computerRows ?? []).map((computer) => ({
          id: computer.id,
          name: computer.name,
          status: computer.status as ComputerStatus,
          total_runtime_seconds: safeNumber(computer.total_runtime_seconds, 'Kompyuter ishlagan vaqt'),
        })),
        transactions: (transactionRows ?? []).map((transaction) => ({
          id: transaction.id,
          kind: transaction.kind as TransactionKind,
          title: transaction.title,
          detail: transaction.detail,
          amount: safeNumber(transaction.amount, 'Operatsiya summasi'),
          product_id: transaction.product_id,
          quantity: transaction.quantity === null ? null : safeNumber(transaction.quantity, 'Operatsiya miqdori'),
          unit_price: transaction.unit_price === null ? null : safeNumber(transaction.unit_price, 'Birlik narxi'),
          unit_cost: transaction.unit_cost === null ? null : safeNumber(transaction.unit_cost, 'Birlik tannarxi'),
          created_at: transaction.created_at,
          handled_by: transaction.handled_by ?? undefined,
          handled_as: transaction.handled_as ?? 'unknown',
        })),
        computerSessions: (sessionRows ?? []).map((session): ComputerSession => ({
          id: session.id,
          computer_id: session.computer_id,
          started_at: session.started_at,
          ended_at: session.ended_at,
          duration_seconds: session.duration_seconds === null ? null : safeNumber(session.duration_seconds, 'Seans davomiyligi'),
        })),
      };
      setData(next);
      setError(null);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Supabase ma’lumotlarini yuklab bo‘lmadi.');
      return false;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [enabled]);

  useEffect(() => { if (enabled) void load(); }, [enabled, load]);

  useEffect(() => {
    const client = supabase;
    if (!enabled || !client) return undefined;
    const channel = client.channel('shon-club-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { void load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'computers' }, () => { void load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => { void load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'computer_sessions' }, () => { void load(); })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeError(null);
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeError('Jonli sinxronlashuv uzildi. Sahifani yangilang.');
      });
    return () => { void client.removeChannel(channel); };
  }, [enabled, load]);

  const saveProduct = useCallback(async (product: Pick<Product, 'name' | 'price' | 'cost_price' | 'stock'>, id: string | undefined, actor: TransactionActor) => {
    const { error: saveError } = await requireSupabase().rpc('save_product', {
      p_id: id ?? null,
      p_name: product.name.trim(),
      p_price: product.price,
      p_cost_price: product.cost_price,
      p_stock: product.stock,
      p_handled_by: actor.name.trim(),
      p_handled_as: actor.role,
    });
    checkResult(saveError);
    await load();
  }, [load]);

  const addProductMovement = useCallback(async (kind: Extract<TransactionKind, 'sale' | 'purchase' | 'stock_opening'>, product: Product, quantity: number, actor: TransactionActor) => {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Miqdorni musbat butun son kiriting.');
    const { error: movementError } = await requireSupabase().rpc('record_product_movement', {
      p_product_id: product.id,
      p_quantity: quantity,
      p_kind: kind,
      p_handled_by: actor.name.trim(),
      p_handled_as: actor.role,
    });
    checkResult(movementError);
    await load();
  }, [load]);

  const recordCash = useCallback(async (kind: Extract<TransactionKind, 'session' | 'expense' | CashMovementKind>, amount: number, note: string, actor: TransactionActor) => {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Summani musbat butun son kiriting.');
    const { error: transactionError } = await requireSupabase().rpc('record_cash_transaction', {
      p_kind: kind,
      p_amount: amount,
      p_detail: note.trim(),
      p_handled_by: actor.name.trim(),
      p_handled_as: actor.role,
    });
    checkResult(transactionError);
    await load();
  }, [load]);

  const addComputer = useCallback(async (name: string) => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 60) throw new Error('Kompyuter nomini 1-60 belgi oraligida kiriting.');
    const { error: computerError } = await requireSupabase().rpc('add_computer', { p_name: cleanName });
    checkResult(computerError);
    await load();
  }, [load]);

  const setComputerStatus = useCallback(async (id: string, status: ComputerStatus) => {
    const { error: statusError } = await requireSupabase().rpc('set_computer_status', { p_computer_id: id, p_status: status });
    checkResult(statusError);
    await load();
  }, [load]);

  return {
    data,
    error: realtimeError ?? error,
    isLoading,
    isRefreshing,
    reload: load,
    addCashMovement: (kind: CashMovementKind, amount: number, note: string, actor: TransactionActor) => recordCash(kind, amount, note, actor),
    addTransaction: (kind: Extract<TransactionKind, 'session' | 'expense'>, amount: number, note: string, actor: TransactionActor) => recordCash(kind, amount, note, actor),
    addProductMovement,
    saveProduct,
    setComputerStatus,
    addComputer,
  };
}
