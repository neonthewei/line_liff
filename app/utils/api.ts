import { Transaction } from "@/types/transaction";

// Supabase API 配置
const SUPABASE_URL = "https://hsezmdybryhvtmfagpwz.supabase.co/rest/v1";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZXptZHlicnlodnRtZmFncHd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTAyMDM0NCwiZXhwIjoyMDU2NTk2MzQ0fQ.ztdHl2lXh5ncQmGvCcPHA4KUF0mOMVKzeATUEE5dKy4";

// API 請求頭
const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
};

/**
 * 根據用戶ID和月份獲取交易數據
 * @param userId 用戶ID
 * @param year 年份
 * @param month 月份 (1-12)
 * @returns 交易數據陣列
 */
export async function fetchTransactionsByUser(userId: string, year: number, month: number): Promise<Transaction[]> {
  try {
    const startDate = new Date(year, month - 1, 1).toISOString(); // 月份從0開始，所以減1
    const endDate = new Date(year, month, 0).toISOString(); // 下個月的第0天就是當月最後一天
    
    console.log(`Fetching transactions for user ${userId} from ${startDate} to ${endDate}`);
    
    // 獲取支出
    const expenseUrl = `${SUPABASE_URL}/expenses?user_id=eq.${userId}&datetime=gte.${startDate}&datetime=lte.${endDate}`;
    const expenseResponse = await fetch(expenseUrl, {
      method: "GET",
      headers,
      cache: "no-cache"
    });
    
    if (!expenseResponse.ok) {
      const errorText = await expenseResponse.text();
      console.error("Error fetching expenses:", errorText);
      throw new Error(`Expense API request failed with status ${expenseResponse.status}: ${errorText}`);
    }
    
    const expenseData = await expenseResponse.json();
    
    // 獲取收入
    const incomeUrl = `${SUPABASE_URL}/incomes?user_id=eq.${userId}&datetime=gte.${startDate}&datetime=lte.${endDate}`;
    const incomeResponse = await fetch(incomeUrl, {
      method: "GET",
      headers,
      cache: "no-cache"
    });
    
    if (!incomeResponse.ok) {
      const errorText = await incomeResponse.text();
      console.error("Error fetching incomes:", errorText);
      throw new Error(`Income API request failed with status ${incomeResponse.status}: ${errorText}`);
    }
    
    const incomeData = await incomeResponse.json();
    
    // 轉換支出數據
    const expenses: Transaction[] = expenseData.map((item: any) => ({
      id: item.id.toString(),
      category: item.category || "其他",
      amount: -Math.abs(item.amount), // 支出為負數
      date: formatDate(item.datetime || new Date().toISOString()),
      type: "expense",
      note: item.memo || "",
      isFixed: item.is_fixed || false,
      fixedFrequency: item.frequency as "day" | "week" | "month" || undefined,
      fixedInterval: item.interval || undefined,
    }));
    
    // 轉換收入數據
    const incomes: Transaction[] = incomeData.map((item: any) => ({
      id: item.id.toString(),
      category: item.category || "其他",
      amount: Math.abs(item.amount), // 收入為正數
      date: formatDate(item.datetime || new Date().toISOString()),
      type: "income",
      note: item.memo || "",
      isFixed: item.is_fixed || false,
      fixedFrequency: item.frequency as "day" | "week" | "month" || undefined,
      fixedInterval: item.interval || undefined,
    }));
    
    // 合併支出和收入
    const transactions = [...expenses, ...incomes];
    console.log(`Found ${transactions.length} transactions: ${expenses.length} expenses, ${incomes.length} incomes`);
    
    return transactions;
  } catch (error) {
    console.error("Error fetching transactions by user:", error);
    return [];
  }
}

/**
 * 獲取月度摘要
 * @param userId 用戶ID
 * @param year 年份
 * @param month 月份 (1-12)
 * @returns 月度摘要數據
 */
export async function fetchMonthlySummary(userId: string, year: number, month: number): Promise<{
  totalExpense: number;
  totalIncome: number;
  balance: number;
}> {
  try {
    // 獲取用戶該月的所有交易
    const transactions = await fetchTransactionsByUser(userId, year, month);
    
    // 計算總支出和總收入
    const summary = transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === "expense") {
          acc.totalExpense += Math.abs(transaction.amount);
        } else {
          acc.totalIncome += transaction.amount;
        }
        return acc;
      },
      { totalExpense: 0, totalIncome: 0, balance: 0 }
    );
    
    // 計算結餘
    summary.balance = summary.totalIncome - summary.totalExpense;
    
    console.log(`Monthly summary for ${year}-${month}: Expense=${summary.totalExpense}, Income=${summary.totalIncome}, Balance=${summary.balance}`);
    return summary;
  } catch (error) {
    console.error("Error fetching monthly summary:", error);
    return { totalExpense: 0, totalIncome: 0, balance: 0 };
  }
}

/**
 * 格式化日期為 "YYYY年MM月DD日" 格式
 * @param dateString ISO 日期字符串
 * @returns 格式化後的日期字符串
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript 月份從 0 開始
    const day = date.getDate();
    
    return `${year}年${month.toString().padStart(2, '0')}月${day.toString().padStart(2, '0')}日`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
} 