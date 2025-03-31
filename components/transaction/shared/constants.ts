// 開發模式標誌 - 設置為 true 可以在本地開發時繞過 LIFF 初始化
export const DEV_MODE = process.env.NODE_ENV === "development";
export const BYPASS_LIFF =
  DEV_MODE && process.env.NEXT_PUBLIC_BYPASS_LIFF === "true";

// 預設類別選項 (僅在 API 請求失敗時使用)
export const defaultCategories = [
  "餐飲",
  "購物",
  "交通",
  "日常",
  "娛樂",
  "運動",
  "旅行",
  "通訊",
  "醫療",
  "其他",
];

// 模擬交易數據 (僅在 API 請求失敗時使用)
export const defaultTransaction = {
  id: "1",
  user_id: "", // 將由 LIFF 初始化時設置
  category: "餐飲",
  amount: -28.0,
  date: "2025年07月06日",
  type: "expense" as "expense" | "income", // 確保類型兼容
  note: "",
  isFixed: false,
  fixedInterval: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Define consistent animation style for all content blocks
export const fadeInAnimation = {
  opacity: 0,
  animation: "fadeIn 0.3s ease-out forwards",
};
