// 定義交易相關的類型

export interface Transaction {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  date: string;
  type: "expense" | "income";
  note: string;
  isFixed?: boolean;
  fixedInterval?: number;
  fixedFrequency?: "day" | "week" | "month";
  created_at?: string;
  updated_at?: string;
}

// 定義類別介面
export interface Category {
  id: number;
  user_id: string | null;
  name: string;
  type: "income" | "expense";
  is_deleted: boolean;
  created_at: string;
}

// 定義組件的 props
export interface TransactionDetailProps {
  onError?: () => void;
}
