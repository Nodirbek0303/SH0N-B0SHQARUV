export type TransactionKind = 'session' | 'sale' | 'purchase' | 'expense' | 'cash_in' | 'cash_out' | 'stock_opening' | 'stock_adjustment';

export type CashMovementKind = Extract<TransactionKind, 'cash_in' | 'cash_out'>;
export type StaffRole = 'operator' | 'manager' | 'unknown';
export interface TransactionActor { name: string; role: Exclude<StaffRole, 'unknown'> }

export interface Transaction {
  id: string;
  kind: TransactionKind;
  title: string;
  detail: string;
  amount: number;
  product_id?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  unit_cost?: number | null;
  created_at: string;
  handled_by?: string;
  handled_as?: StaffRole;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  stock: number;
}

export type ComputerStatus = 'free' | 'busy' | 'broken';

export interface Computer {
  id: string;
  name: string;
  status: ComputerStatus;
  total_runtime_seconds?: number;
}

export interface ComputerSession {
  id: string;
  computer_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}
