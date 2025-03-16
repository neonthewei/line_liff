import { Transaction } from "@/types/transaction";
import { sendUpdateNotification, sendDeleteNotification } from "./line-messaging";

// Supabase API 配置
export const SUPABASE_URL = "https://hsezmdybryhvtmfagpwz.supabase.co/rest/v1";
export const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZXptZHlicnlodnRtZmFncHd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTAyMDM0NCwiZXhwIjoyMDU2NTk2MzQ0fQ.ztdHl2lXh5ncQmGvCcPHA4KUF0mOMVKzeATUEE5dKy4";

// API 請求頭
const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
};

// 緩存配置
const CACHE_DURATION = 60 * 5; // 5分鐘緩存

/**
 * 根據用戶ID和月份獲取交易數據
 * @param userId 用戶ID
 * @param year 年份
 * @param month 月份 (1-12)
 * @returns 交易數據陣列
 */
export async function fetchTransactionsByUser(userId: string, year: number, month: number): Promise<Transaction[]> {
  try {
    // 設置時間為中午12點，避免時區問題導致日期偏移
    const startDate = new Date(year, month - 1, 1, 12, 0, 0).toISOString(); // 月份從0開始，所以減1
    const endDate = new Date(year, month, 0, 12, 0, 0).toISOString(); // 下個月的第0天就是當月最後一天
    
    console.log(`Fetching transactions for user ${userId} from ${startDate} to ${endDate}`);
    
    // 緩存鍵
    const cacheKey = `transactions_${userId}_${year}_${month}`;
    
    // 檢查緩存
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      // 檢查緩存是否過期
      if ((Date.now() - timestamp) / 1000 < CACHE_DURATION) {
        console.log(`Using cached transactions data for ${userId} (${year}-${month})`);
        return data;
      }
    }
    
    // 獲取支出
    const expenseUrl = `${SUPABASE_URL}/expenses?user_id=eq.${userId}&datetime=gte.${startDate}&datetime=lte.${endDate}`;
    const expenseResponse = await fetch(expenseUrl, {
      method: "GET",
      headers: {
        ...headers,
        "Prefer": "return=representation",
        "Cache-Control": "max-age=300" // 5分鐘緩存
      },
      next: { revalidate: 300 } // NextJS 緩存配置
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
      headers: {
        ...headers,
        "Prefer": "return=representation",
        "Cache-Control": "max-age=300" // 5分鐘緩存
      },
      next: { revalidate: 300 } // NextJS 緩存配置
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
    
    // 更新緩存
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: transactions,
      timestamp: Date.now()
    }));
    
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
    // 緩存鍵
    const cacheKey = `summary_${userId}_${year}_${month}`;
    
    // 檢查緩存
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      // 檢查緩存是否過期
      if ((Date.now() - timestamp) / 1000 < CACHE_DURATION) {
        console.log(`Using cached summary data for ${userId} (${year}-${month})`);
        return data;
      }
    }
    
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
    
    // 更新緩存
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: summary,
      timestamp: Date.now()
    }));
    
    return summary;
  } catch (error) {
    console.error("Error fetching monthly summary:", error);
    return { totalExpense: 0, totalIncome: 0, balance: 0 };
  }
}

/**
 * 根據 ID 獲取交易詳情
 * @param id 交易 ID
 * @param type 交易類型 (expense 或 income)
 * @returns 交易詳情
 */
export async function fetchTransactionById(id: string, type: string): Promise<Transaction | null> {
  try {
    // 根據類型選擇 API 端點
    const endpoint = type === "income" ? "incomes" : "expenses";
    
    // 構建 API URL
    const url = `${SUPABASE_URL}/${endpoint}?id=eq.${id}`;
    
    console.log("Making API request with:");
    console.log("URL:", url);
    console.log("Headers:", JSON.stringify(headers, null, 2));
    
    // 發送 API 請求
    const response = await fetch(url, { 
      method: "GET",
      headers,
      cache: "no-cache" // 禁用緩存
    });
    
    console.log("Response status:", response.status);
    console.log("Response status text:", response.statusText);
    
    // 如果響應不成功，記錄更多信息
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response body:", errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    // 解析響應數據
    const data = await response.json();
    console.log("API response data:", JSON.stringify(data, null, 2));
    
    // 檢查是否有數據
    if (!data || data.length === 0) {
      console.log(`No transaction found with id ${id} and type ${type}`);
      return null;
    }
    
    // 獲取第一個結果
    const apiTransaction = data[0];
    
    // 轉換為應用程序的交易格式
    const result: Transaction = {
      id: apiTransaction.id.toString(),
      category: apiTransaction.category || "其他",
      amount: type === "expense" ? -Math.abs(apiTransaction.amount) : Math.abs(apiTransaction.amount),
      date: formatDate(apiTransaction.datetime || new Date().toISOString()),
      type: (type === "income" ? "income" : "expense") as "income" | "expense",
      note: apiTransaction.memo || "",
      isFixed: apiTransaction.is_fixed || false,
      fixedFrequency: apiTransaction.frequency as "day" | "week" | "month" || undefined,
      fixedInterval: apiTransaction.interval || undefined,
    };
    
    console.log("Transformed transaction data:", result);
    return result;
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return null;
  }
}

/**
 * 更新交易
 * @param transaction 交易數據
 * @returns 是否成功
 */
export async function updateTransactionApi(transaction: Transaction): Promise<boolean> {
  try {
    // 根據類型選擇 API 端點
    const endpoint = transaction.type === "income" ? "incomes" : "expenses";
    
    // 構建 API URL
    const url = `${SUPABASE_URL}/${endpoint}?id=eq.${transaction.id}`;
    
    // 準備要更新的數據 - 映射到 API 期望的字段名稱
    const updateData = {
      category: transaction.category,
      amount: Math.abs(transaction.amount), // 存儲絕對值
      datetime: parseDateToISOString(transaction.date), // 使用 datetime 而不是 date
      memo: transaction.note, // 使用 memo 而不是 note
      is_fixed: transaction.isFixed, // 添加是否為固定支出/收入
      frequency: transaction.fixedFrequency, // 固定支出/收入頻率
      interval: transaction.fixedInterval, // 固定支出/收入間隔
    };
    
    console.log("Making update API request with:");
    console.log("URL:", url);
    console.log("Headers:", JSON.stringify(headers, null, 2));
    console.log("Data:", JSON.stringify(updateData, null, 2));
    
    // 發送 API 請求
    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updateData),
    });
    
    console.log("Update response status:", response.status);
    console.log("Update response status text:", response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Update error response body:", errorText);
      throw new Error(`Update API request failed with status ${response.status}: ${errorText}`);
    }
    
    console.log("Transaction updated successfully");
    
    // 發送 LINE 通知
    try {
      await sendUpdateNotification(transaction);
    } catch (notificationError) {
      console.error("Failed to send LINE notification:", notificationError);
      // 即使通知發送失敗，我們仍然認為更新成功
    }
    
    // 清除該用戶的緩存，確保下次獲取數據時能獲取最新數據
    // 從日期中提取年月
    const match = transaction.date.match(/(\d+)年(\d+)月(\d+)日/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      
      // 獲取用戶ID
      const userId = await getUserIdFromLiff();
      if (userId) {
        clearTransactionCache(userId, year, month);
      } else {
        // 如果無法獲取用戶ID，清除所有緩存
        console.log("Could not determine user ID, clearing all caches");
        sessionStorage.clear();
      }
    } else {
      // 如果無法解析日期，清除所有緩存
      console.log("Could not parse date, clearing all caches");
      sessionStorage.clear();
    }
    
    return true;
  } catch (error) {
    console.error("Error updating transaction:", error);
    return false;
  }
}

/**
 * 從LIFF獲取用戶ID
 * @returns 用戶ID或null
 */
async function getUserIdFromLiff(): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && window.liff && window.liff.isLoggedIn()) {
      const profile = await window.liff.getProfile();
      return profile.userId;
    }
    return null;
  } catch (error) {
    console.error("Error getting user ID from LIFF:", error);
    return null;
  }
}

/**
 * 刪除交易
 * @param id 交易 ID
 * @param type 交易類型
 * @returns 是否成功
 */
export async function deleteTransactionApi(id: string, type: string): Promise<boolean> {
  try {
    // 先獲取交易詳情，以便在刪除後發送通知
    const transaction = await fetchTransactionById(id, type);
    if (!transaction) {
      throw new Error(`Transaction with id ${id} and type ${type} not found`);
    }
    
    // 根據類型選擇 API 端點
    const endpoint = type === "income" ? "incomes" : "expenses";
    
    // 構建 API URL
    const url = `${SUPABASE_URL}/${endpoint}?id=eq.${id}`;
    
    console.log("Making delete API request with:");
    console.log("URL:", url);
    console.log("Headers:", JSON.stringify(headers, null, 2));
    
    // 發送 API 請求
    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });
    
    console.log("Delete response status:", response.status);
    console.log("Delete response status text:", response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Delete error response body:", errorText);
      throw new Error(`Delete API request failed with status ${response.status}: ${errorText}`);
    }
    
    console.log("Transaction deleted successfully");
    
    // 發送 LINE 通知
    try {
      await sendDeleteNotification(transaction);
    } catch (notificationError) {
      console.error("Failed to send LINE notification:", notificationError);
      // 即使通知發送失敗，我們仍然認為刪除成功
    }
    
    // 清除該用戶的緩存，確保下次獲取數據時能獲取最新數據
    // 從日期中提取年月
    const match = transaction.date.match(/(\d+)年(\d+)月(\d+)日/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      
      // 獲取用戶ID
      const userId = await getUserIdFromLiff();
      if (userId) {
        clearTransactionCache(userId, year, month);
      } else {
        // 如果無法獲取用戶ID，清除所有緩存
        console.log("Could not determine user ID, clearing all caches");
        sessionStorage.clear();
      }
    } else {
      // 如果無法解析日期，清除所有緩存
      console.log("Could not parse date, clearing all caches");
      sessionStorage.clear();
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return false;
  }
}

/**
 * 格式化日期為 "YYYY年MM月DD日" 格式
 * @param dateString ISO 日期字符串
 * @returns 格式化後的日期字符串
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month.toString().padStart(2, '0')}月${day.toString().padStart(2, '0')}日`;
}

/**
 * 將 "YYYY年MM月DD日" 格式的日期解析為 ISO 字符串
 * @param dateString 格式化的日期字符串
 * @returns ISO 日期字符串
 */
export function parseDateToISOString(dateString: string): string {
  const match = dateString.match(/(\d+)年(\d+)月(\d+)日/);
  if (!match) {
    return new Date().toISOString();
  }
  
  const year = parseInt(match[1]);
  const month = parseInt(match[2]) - 1; // 月份從0開始
  const day = parseInt(match[3]);
  
  // 設置時間為中午12點，避免時區問題導致日期偏移
  const date = new Date(year, month, day, 12, 0, 0);
  return date.toISOString();
}

/**
 * 清除特定用戶和月份的交易緩存
 * @param userId 用戶ID
 * @param year 年份
 * @param month 月份 (1-12)
 */
export function clearTransactionCache(userId: string, year?: number, month?: number): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return; // 在服務器端不執行
    }
    
    if (year !== undefined && month !== undefined) {
      // 清除特定月份的緩存
      const cacheKey = `transactions_${userId}_${year}_${month}`;
      const summaryKey = `summary_${userId}_${year}_${month}`;
      sessionStorage.removeItem(cacheKey);
      sessionStorage.removeItem(summaryKey);
      console.log(`Cleared cache for user ${userId} for ${year}-${month}`);
    } else {
      // 清除該用戶的所有緩存
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.includes(`_${userId}_`)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      console.log(`Cleared all cache for user ${userId}, removed ${keysToRemove.length} items`);
    }
  } catch (error) {
    console.error("Error clearing transaction cache:", error);
  }
} 