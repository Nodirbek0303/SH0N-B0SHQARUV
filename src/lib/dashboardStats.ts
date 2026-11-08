import type { Computer, ComputerStatus, Product, Transaction, TransactionKind } from '@/types/club';

const INCOME_KINDS: TransactionKind[] = ['session', 'sale'];
const OUTFLOW_KINDS: TransactionKind[] = ['purchase', 'expense', 'cash_out'];
const WEEK_LABELS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
const DAY_MS = 86_400_000;

const sumOf = (items: Transaction[], kinds: TransactionKind[]) => items.reduce((sum, item) => kinds.includes(item.kind) ? sum + item.amount : sum, 0);
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const startOfWeek = (date: Date) => addDays(startOfDay(date), -((date.getDay() + 6) % 7));
const dayNumber = (date: Date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
const trendPercent = (current: number, previous: number): number | null => previous === 0 ? (current === 0 ? 0 : null) : Math.round(((current - previous) / Math.abs(previous)) * 100);
const isSale = (item: Transaction) => item.kind === 'sale';
const quantityOfSales = (items: Transaction[]) => items.filter(isSale).reduce((sum, item) => sum + (item.quantity ?? 1), 0);
const saleCost = (item: Transaction) => (item.unit_cost ?? 0) * (item.quantity ?? 1);

export interface ProductSales { name: string; quantity: number; revenue: number; share: number }
export interface DashboardStats {
  totals: { cashBalance: number };
  rangeTotals: { income: number; expense: number; profit: number };
  trends: { income: number | null; expense: number | null; profit: number | null; sessions: number | null; sales: number | null; stock: number | null };
  week: { labels: string[]; income: number[]; expense: number[]; sales: number[]; saleCount: number[] };
  today: { sessions: number; sales: number; saleQuantity: number; expenses: number; turnover: number; cashIn: number; cashOut: number; income: number; expense: number; profit: number };
  productSales: ProductSales[];
  stock: { units: number; value: number; low: number; out: number };
}

export function computeDashboardStats(transactions: Transaction[], products: Product[], now: Date): DashboardStats {
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const previousWeekStart = addDays(weekStart, -7);
  const elapsedDays = dayNumber(todayStart) - dayNumber(weekStart) + 1;
  const previousComparableEnd = addDays(previousWeekStart, elapsedDays);
  const yesterdayStart = addDays(todayStart, -1);
  const tomorrowStart = addDays(todayStart, 1);
  const between = (from: Date, to: Date) => transactions.filter((item) => {
    const time = Date.parse(item.created_at);
    return Number.isFinite(time) && time >= from.getTime() && time < to.getTime();
  });
  const thisWeek = between(weekStart, tomorrowStart);
  const previousWeek = between(previousWeekStart, previousComparableEnd);
  const today = between(todayStart, tomorrowStart);
  const yesterday = between(yesterdayStart, todayStart);
  const weekIncome = sumOf(thisWeek, INCOME_KINDS);
  const weekOutflow = sumOf(thisWeek, OUTFLOW_KINDS);
  const previousIncome = sumOf(previousWeek, INCOME_KINDS);
  const previousOutflow = sumOf(previousWeek, OUTFLOW_KINDS);
  const weekCashIn = sumOf(thisWeek, ['cash_in']);
  const previousCashIn = sumOf(previousWeek, ['cash_in']);
  const weekCashChange = weekIncome + weekCashIn - weekOutflow;
  const previousCashChange = previousIncome + previousCashIn - previousOutflow;

  const productNames = new Map(products.map((product) => [product.id, product.name]));
  const salesByProduct = new Map<string, { quantity: number; revenue: number }>();
  for (const item of transactions.filter(isSale)) {
    const name = (item.product_id && productNames.get(item.product_id))
      || item.detail.trim()
      || item.title.replace(/^Sotuv:\s*/i, '').trim()
      || 'Noma’lum mahsulot';
    const current = salesByProduct.get(name) ?? { quantity: 0, revenue: 0 };
    const quantity = item.quantity ?? 1;
    current.quantity += quantity;
    current.revenue += item.amount;
    salesByProduct.set(name, current);
  }
  const productSales = [...salesByProduct.entries()]
    .map(([name, values]) => ({ name, ...values, share: 0 }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
  const totalSoldQuantity = productSales.reduce((sum, item) => sum + item.quantity, 0);
  for (const item of productSales) item.share = totalSoldQuantity ? Math.round((item.quantity / totalSoldQuantity) * 100) : 0;

  const week = { labels: WEEK_LABELS, income: Array(7).fill(0) as number[], expense: Array(7).fill(0) as number[], sales: Array(7).fill(0) as number[], saleCount: Array(7).fill(0) as number[] };
  for (const item of thisWeek) {
    const index = (new Date(item.created_at).getDay() + 6) % 7;
    if (INCOME_KINDS.includes(item.kind)) week.income[index] += item.amount;
    if (OUTFLOW_KINDS.includes(item.kind)) week.expense[index] += item.amount;
    if (isSale(item)) {
      week.sales[index] += item.amount;
      week.saleCount[index] += item.quantity ?? 1;
    }
  }

  const todayIncome = sumOf(today, INCOME_KINDS);
  const todayOutflow = sumOf(today, OUTFLOW_KINDS);
  const todayCashIn = todayIncome + sumOf(today, ['cash_in']);
  const todayCogs = today.filter(isSale).reduce((sum, item) => sum + saleCost(item), 0);
  const todayOperatingExpense = sumOf(today, ['expense']);
  const stockUnits = products.reduce((sum, product) => sum + product.stock, 0);
  const stockMovementThisWeek = thisWeek.reduce((sum, item) => {
    if (!item.product_id || !item.quantity) return sum;
    return item.kind === 'sale' ? sum - item.quantity : item.kind === 'purchase' || item.kind === 'stock_opening' || item.kind === 'stock_adjustment' ? sum + item.quantity : sum;
  }, 0);
  const previousStockUnits = stockUnits - stockMovementThisWeek;
  const cashBalance = transactions.reduce((balance, item) => {
    if (INCOME_KINDS.includes(item.kind) || item.kind === 'cash_in') return balance + item.amount;
    if (OUTFLOW_KINDS.includes(item.kind)) return balance - item.amount;
    return balance;
  }, 0);

  return {
    totals: { cashBalance },
    rangeTotals: { income: weekIncome, expense: weekOutflow, profit: weekCashChange },
    trends: {
      income: trendPercent(weekIncome, previousIncome),
      expense: trendPercent(weekOutflow, previousOutflow),
      profit: trendPercent(weekCashChange, previousCashChange),
      sessions: trendPercent(today.filter((item) => item.kind === 'session').length, yesterday.filter((item) => item.kind === 'session').length),
      sales: trendPercent(quantityOfSales(thisWeek), quantityOfSales(previousWeek)),
      stock: previousStockUnits < 0 ? null : trendPercent(stockUnits, previousStockUnits),
    },
    week,
    today: {
      sessions: today.filter((item) => item.kind === 'session').length,
      sales: today.filter(isSale).length,
      saleQuantity: quantityOfSales(today),
      expenses: today.filter((item) => item.kind === 'purchase' || item.kind === 'expense').length,
      turnover: todayCashIn + todayOutflow,
      cashIn: todayCashIn,
      cashOut: todayOutflow,
      income: todayIncome,
      expense: todayCogs + todayOperatingExpense,
      profit: todayIncome - todayCogs - todayOperatingExpense,
    },
    productSales,
    stock: {
      units: stockUnits,
      value: products.reduce((sum, product) => sum + product.price * product.stock, 0),
      low: products.filter((product) => product.stock > 0 && product.stock < 10).length,
      out: products.filter((product) => product.stock === 0).length,
    },
  };
}

export const countComputersByStatus = (computers: Computer[]): Record<ComputerStatus, number> => computers.reduce<Record<ComputerStatus, number>>(
  (counts, computer) => { counts[computer.status] += 1; return counts; },
  { free: 0, busy: 0, broken: 0 },
);
