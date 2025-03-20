// 交易類型定義
export type Transaction = {
  id: string;
  category: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  note: string;
  created_at?: string; // 創建時間
  updated_at?: string; // 更新時間
}; 