// 交易類型定義
export type Transaction = {
  id: string;
  category: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  note: string;
  isFixed: boolean;
  fixedFrequency?: "day" | "week" | "month"; // 固定支出/收入頻率
  fixedInterval?: number; // 固定支出/收入間隔（數字）
}; 