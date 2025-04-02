// 導入共享類型
import type { Transaction } from "@/types/transaction";

// 重新導出 Transaction 類型
export type { Transaction };

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
  transaction?: Transaction; // Optional direct transaction object
  onError?: () => void;
  onUpdate?: (updatedTransaction: Transaction) => void;
  onDelete?: () => void;
  onBack?: () => void;
}

// Toast 通知類型
export type ToastType = "success" | "error";
