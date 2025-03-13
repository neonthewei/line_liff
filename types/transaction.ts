// 交易類型定義
export type Transaction = {
  id: string;
  category: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  note: string;
  isFixed: boolean;
}; 