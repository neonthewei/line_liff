import liff from "@line/liff";
import type { Transaction } from "@/types/transaction";

// 從 LIFF 獲取用戶 ID
export async function getUserIdFromLiff(): Promise<string | null> {
  try {
    if (
      typeof window !== "undefined" &&
      window.liff &&
      window.liff.isLoggedIn()
    ) {
      const profile = await window.liff.getProfile();
      return profile.userId;
    }
    return null;
  } catch (error) {
    console.error("Error getting user ID from LIFF:", error);
    return null;
  }
}

// 檢查交易是否有變更
export function hasTransactionChanged(
  transaction: Transaction | null,
  originalTransaction: Transaction | null
): boolean {
  if (!transaction || !originalTransaction) return false;

  return (
    transaction.type !== originalTransaction.type ||
    transaction.category !== originalTransaction.category ||
    transaction.amount !== originalTransaction.amount ||
    transaction.date !== originalTransaction.date ||
    transaction.note !== originalTransaction.note
  );
}

// 日曆相關函數
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// 格式化日期為 "YYYY年MM月DD日" 格式
export function formatDateToChineseString(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${year}年${month.toString().padStart(2, "0")}月${day
    .toString()
    .padStart(2, "0")}日`;
}

// 獲取月份名稱
export function getMonthName(month: number): string {
  const monthNames = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ];
  return monthNames[month];
}
