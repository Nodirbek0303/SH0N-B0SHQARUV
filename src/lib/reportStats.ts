import type { Computer, ComputerSession, Product, StaffRole, Transaction } from '@/types/club';

const INCOME = new Set(['session', 'sale']);
const OUTFLOW = new Set(['purchase', 'expense', 'cash_out']);
const DAY_MS = 86_400_000;

export interface ReportMetrics {
  revenue: number;
  cashIn: number;
  cashOut: number;
  cashChange: number;
  costOfSales: number;
  operatingExpense: number;
  netProfit: number;
  sessions: number;
  sales: number;
  soldUnits: number;
  operations: number;
  computerRuntimeSeconds: number;
}
export interface ReportProduct { id: string; name: string; quantity: number; revenue: number; cost: number; profit: number }
export interface ReportStaff { key: string; name: string; role: StaffRole; operations: number; salesUnits: number; cashIn: number; cashOut: number }
export interface ReportComputer { id: string; name: string; sessions: number; runtimeSeconds: number }
export interface ReportStats { current: ReportMetrics; previous: ReportMetrics; products: ReportProduct[]; staff: ReportStaff[]; computers: ReportComputer[]; transactions: Transaction[]; previousFrom: Date; previousTo: Date }

function runtimeInRange(sessions: ComputerSession[], lower: Date, upper: Date, now: number) {
  const startLimit = lower.getTime();
  const endLimit = upper.getTime();
  return sessions.reduce((sum, session) => {
    const start = Date.parse(session.started_at);
    const end = session.ended_at ? Date.parse(session.ended_at) : now;
    const overlap = Math.max(0, Math.min(end, endLimit) - Math.max(start, startLimit));
    return sum + Math.floor(overlap / 1000);
  }, 0);
}

function makeMetrics(transactions: Transaction[], sessions: ComputerSession[], lower: Date, upper: Date, now: number): ReportMetrics {
  const revenue = transactions.filter((item) => INCOME.has(item.kind)).reduce((sum, item) => sum + item.amount, 0);
  const cashIn = transactions.filter((item) => INCOME.has(item.kind) || item.kind === 'cash_in').reduce((sum, item) => sum + item.amount, 0);
  const cashOut = transactions.filter((item) => OUTFLOW.has(item.kind)).reduce((sum, item) => sum + item.amount, 0);
  const costOfSales = transactions.filter((item) => item.kind === 'sale').reduce((sum, item) => sum + (item.unit_cost ?? 0) * (item.quantity ?? 1), 0);
  const operatingExpense = transactions.filter((item) => item.kind === 'expense').reduce((sum, item) => sum + item.amount, 0);
  return {
    revenue, cashIn, cashOut, cashChange: cashIn - cashOut, costOfSales, operatingExpense,
    netProfit: revenue - costOfSales - operatingExpense,
    sessions: transactions.filter((item) => item.kind === 'session').length,
    sales: transactions.filter((item) => item.kind === 'sale').length,
    soldUnits: transactions.filter((item) => item.kind === 'sale').reduce((sum, item) => sum + (item.quantity ?? 1), 0),
    operations: transactions.length,
    computerRuntimeSeconds: runtimeInRange(sessions, lower, upper, now),
  };
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function computeReportStats(transactions: Transaction[], products: Product[], sessions: ComputerSession[], computers: Computer[], fromValue: string, toValue: string, now = Date.now()): ReportStats {
  const from = startOfDay(new Date(`${fromValue}T00:00:00`));
  const to = addDays(startOfDay(new Date(`${toValue}T00:00:00`)), 1);
  const duration = Math.max(1, Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / DAY_MS));
  const previousFrom = addDays(from, -duration);
  const previousTo = from;
  const inRange = (transaction: Transaction, lower: Date, upper: Date) => {
    const time = Date.parse(transaction.created_at);
    return Number.isFinite(time) && time >= lower.getTime() && time < upper.getTime();
  };
  const selected = transactions.filter((item) => inRange(item, from, to));
  const earlier = transactions.filter((item) => inRange(item, previousFrom, previousTo));
  const productNames = new Map(products.map((item) => [item.id, item.name]));
  const productGroups = new Map<string, ReportProduct>();
  for (const item of selected.filter((transaction) => transaction.kind === 'sale')) {
    const name = (item.product_id && productNames.get(item.product_id)) || item.detail.trim() || "Noma'lum mahsulot";
    const id = item.product_id || `unlinked:${name.toLocaleLowerCase()}`;
    const quantity = item.quantity ?? 1;
    const cost = (item.unit_cost ?? 0) * quantity;
    const group = productGroups.get(id) ?? { id, name, quantity: 0, revenue: 0, cost: 0, profit: 0 };
    group.quantity += quantity;
    group.revenue += item.amount;
    group.cost += cost;
    group.profit += item.amount - cost;
    productGroups.set(id, group);
  }
  const staffGroups = new Map<string, ReportStaff>();
  for (const item of selected) {
    const name = item.handled_by?.trim() || 'Eski yozuv';
    const role = item.handled_as === 'operator' || item.handled_as === 'manager' ? item.handled_as : 'unknown';
    const key = `${role}:${name.toLocaleLowerCase()}`;
    const group = staffGroups.get(key) ?? { key, name, role, operations: 0, salesUnits: 0, cashIn: 0, cashOut: 0 };
    group.operations += 1;
    if (item.kind === 'sale') group.salesUnits += item.quantity ?? 1;
    if (INCOME.has(item.kind) || item.kind === 'cash_in') group.cashIn += item.amount;
    if (OUTFLOW.has(item.kind)) group.cashOut += item.amount;
    staffGroups.set(key, group);
  }
  const normalizedProducts = [...productGroups.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
  const normalizedStaff = [...staffGroups.values()].sort((a, b) => b.cashIn - a.cashIn || b.operations - a.operations);
  const computerNames = new Map(computers.map((computer) => [computer.id, computer.name]));
  const usage = new Map<string, ReportComputer>(computers.map((computer) => [computer.id, { id: computer.id, name: computer.name, sessions: 0, runtimeSeconds: 0 }]));
  const runtimeMilliseconds = new Map<string, number>();
  for (const session of sessions) {
    const start = Date.parse(session.started_at);
    const end = session.ended_at ? Date.parse(session.ended_at) : now;
    const overlap = Math.max(0, Math.min(end, to.getTime()) - Math.max(start, from.getTime()));
    if (overlap <= 0) continue;
    const item = usage.get(session.computer_id) ?? { id: session.computer_id, name: computerNames.get(session.computer_id) ?? 'O\'chirilgan kompyuter', sessions: 0, runtimeSeconds: 0 };
    if (start >= from.getTime() && start < to.getTime()) item.sessions += 1;
    runtimeMilliseconds.set(session.computer_id, (runtimeMilliseconds.get(session.computer_id) ?? 0) + overlap);
    usage.set(session.computer_id, item);
  }
  for (const [computerId, milliseconds] of runtimeMilliseconds) {
    const item = usage.get(computerId);
    if (item) item.runtimeSeconds = Math.floor(milliseconds / 1000);
  }
  const normalizedComputers = [...usage.values()].sort((a, b) => b.runtimeSeconds - a.runtimeSeconds);
  return { current: makeMetrics(selected, sessions, from, to, now), previous: makeMetrics(earlier, sessions, previousFrom, previousTo, now), products: normalizedProducts, staff: normalizedStaff, computers: normalizedComputers, transactions: selected, previousFrom, previousTo };
}

export const formatDateKey = dateKey;
