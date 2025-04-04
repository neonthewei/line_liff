// 交易類型定義
export type Transaction = {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  note: string;
  accountBook?: string; // 帳本ID
  isFixed?: boolean; // 是否為固定支出/收入
  fixedFrequency?: "day" | "week" | "month"; // 固定支出/收入頻率
  fixedInterval?: number; // 固定支出/收入間隔
  created_at?: string; // 創建時間
  updated_at?: string; // 更新時間
};
