// Define the recurring transaction type based on the table structure
export interface RecurringTransaction {
  id: string | number;
  user_id: string;
  memo: string;
  amount: number;
  type: "expense" | "income";
  start_date: string;
  end_date?: string;
  interval: string;
  frequency: number;
  created_at?: string;
  updated_at?: string;
  category?: string;
}

// Define the Category interface
export interface Category {
  id: number;
  user_id: string | null;
  name: string;
  type: "income" | "expense";
  is_deleted: boolean;
  created_at: string;
}

export interface RecurringListProps {
  userId: string;
  onClose: () => void;
  onDataChanged?: () => void;
  onSelect: (transaction: RecurringTransaction) => void;
  onCreate: () => void;
}

export interface GroupedTransactions {
  expenses: RecurringTransaction[];
  incomes: RecurringTransaction[];
}
