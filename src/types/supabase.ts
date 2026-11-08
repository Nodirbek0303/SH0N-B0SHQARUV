import type { ComputerStatus, TransactionKind } from '@/types/club';

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ProductRow = {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  stock: number;
  created_at: string;
}

type ComputerRow = {
  id: string;
  name: string;
  status: ComputerStatus;
  total_runtime_seconds: number;
  created_at: string;
}

type TransactionRow = {
  id: string;
  kind: TransactionKind;
  title: string;
  detail: string;
  amount: number;
  product_id: string | null;
  quantity: number | null;
  unit_price: number | null;
  unit_cost: number | null;
  handled_by: string | null;
  handled_as: 'operator' | 'manager' | null;
  created_at: string;
}

type ComputerSessionRow = {
  id: string;
  computer_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export type Database = {
  public: {
    Tables: {
      products: Table<ProductRow, Pick<ProductRow, 'name' | 'price' | 'cost_price' | 'stock'>, Partial<ProductRow>>;
      computers: Table<ComputerRow, Pick<ComputerRow, 'name'>, Partial<ComputerRow>>;
      transactions: Table<TransactionRow, Partial<TransactionRow>, Partial<TransactionRow>>;
      computer_sessions: Table<ComputerSessionRow, Partial<ComputerSessionRow>, Partial<ComputerSessionRow>>;
    };
    Views: { [_ in never]: never };
    Functions: {
      add_computer: { Args: { p_name: string }; Returns: string };
      save_product: {
        Args: {
          p_id: string | null;
          p_name: string;
          p_price: number;
          p_cost_price: number;
          p_stock: number;
          p_handled_by: string;
          p_handled_as: 'operator' | 'manager';
        };
        Returns: string;
      };
      record_product_movement: {
        Args: {
          p_product_id: string;
          p_quantity: number;
          p_kind: 'sale' | 'purchase' | 'stock_opening';
          p_handled_by: string;
          p_handled_as: 'operator' | 'manager';
        };
        Returns: undefined;
      };
      record_cash_transaction: {
        Args: {
          p_kind: 'session' | 'expense' | 'cash_in' | 'cash_out';
          p_amount: number;
          p_detail: string;
          p_handled_by: string;
          p_handled_as: 'operator' | 'manager';
        };
        Returns: undefined;
      };
      set_computer_status: {
        Args: { p_computer_id: string; p_status: ComputerStatus };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
