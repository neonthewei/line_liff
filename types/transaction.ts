// 交易類型定義
export interface Transaction {
  id: string;
  category: string;
  amount: number;
  date: string;
  type: "expense" | "income";
  note: string;
} 