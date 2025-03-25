import { Transaction } from "@/types/transaction";
import {
  sendUpdateNotification,
  sendDeleteNotification,
} from "./line-messaging";

// Supabase API 配置
export const SUPABASE_URL = "https://hsezmdybryhvtmfagpwz.supabase.co/rest/v1";
export const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZXptZHlicnlodnRtZmFncHd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTAyMDM0NCwiZXhwIjoyMDU2NTk2MzQ0fQ.ztdHl2lXh5ncQmGvCcPHA4KUF0mOMVKzeATUEE5dKy4";

// API 請求頭
const headers = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
};

// 緩存配置
const CACHE_DURATION = 60 * 5; // 5分鐘緩存

/**
 * 標準化交易資料，確保所有必要的屬性都存在且格式一致
 * @param apiTransaction API 返回的交易資料
 * @returns 標準化後的交易資料
 */
function normalizeTransaction(apiTransaction: any): Transaction {
  // 確保日期格式正確
  let formattedDate = "";
  try {
    formattedDate = formatDate(
      apiTransaction.datetime || new Date().toISOString()
    );
  } catch (error) {
    console.error("日期格式化錯誤:", error);
    formattedDate = formatDate(new Date().toISOString());
  }

  // 標準化交易資料
  return {
    id: apiTransaction.id.toString(),
    user_id: apiTransaction.user_id,
    category: apiTransaction.category || "其他",
    amount:
      apiTransaction.type === "expense"
        ? -Math.abs(apiTransaction.amount)
        : Math.abs(apiTransaction.amount),
    date: formattedDate,
    type: (apiTransaction.type === "income" ? "income" : "expense") as
      | "income"
      | "expense",
    note: apiTransaction.memo || "",
    isFixed: apiTransaction.is_fixed || false,
    fixedFrequency:
      (apiTransaction.frequency as "day" | "week" | "month") || undefined,
    fixedInterval: apiTransaction.interval || undefined,
    created_at: apiTransaction.created_at || undefined,
    updated_at:
      apiTransaction.updated_at || apiTransaction.created_at || undefined,
  };
}

/**
 * 根據用戶ID和月份獲取交易數據
 * @param userId 用戶ID
 * @param year 年份
 * @param month 月份 (1-12)，如果不提供則獲取整年數據
 * @returns 交易數據陣列
 */
export async function fetchTransactionsByUser(
  userId: string,
  year: number,
  month?: number
): Promise<Transaction[]> {
  try {
    let startDate: string;
    let endDate: string;
    let cacheKey: string;

    if (month) {
      // 月度數據 - 設置時間為中午12點，避免時區問題導致日期偏移
      startDate = new Date(year, month - 1, 1, 12, 0, 0).toISOString(); // 月份從0開始，所以減1
      endDate = new Date(year, month, 0, 12, 0, 0).toISOString(); // 下個月的第0天就是當月最後一天
      cacheKey = `transactions_${userId}_${year}_${month}`;
      console.log(
        `Fetching monthly transactions for user ${userId} from ${startDate} to ${endDate}`
      );
    } else {
      // 年度數據
      startDate = new Date(year, 0, 1, 12, 0, 0).toISOString(); // 1月1日
      endDate = new Date(year, 11, 31, 12, 0, 0).toISOString(); // 12月31日
      cacheKey = `transactions_${userId}_${year}_yearly`;
      console.log(
        `Fetching yearly transactions for user ${userId} from ${startDate} to ${endDate}`
      );
    }

    // 檢查緩存
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      // 檢查緩存是否過期
      if ((Date.now() - timestamp) / 1000 < CACHE_DURATION) {
        console.log(
          `Using cached transactions data for ${userId} (${year}${
            month ? `-${month}` : " yearly"
          })`
        );
        return data;
      }
    }

    // 獲取所有交易
    const transactionsUrl = `${SUPABASE_URL}/transactions?user_id=eq.${userId}&datetime=gte.${startDate}&datetime=lte.${endDate}`;
    const transactionsResponse = await fetch(transactionsUrl, {
      method: "GET",
      headers: {
        ...headers,
        Prefer: "return=representation",
        "Cache-Control": "max-age=300", // 5分鐘緩存
      },
      next: { revalidate: 300 }, // NextJS 緩存配置
    });

    if (!transactionsResponse.ok) {
      const errorText = await transactionsResponse.text();
      console.error("Error fetching transactions:", errorText);
      throw new Error(
        `Transactions API request failed with status ${transactionsResponse.status}: ${errorText}`
      );
    }

    const transactionsData = await transactionsResponse.json();

    // 使用標準化函數轉換交易數據
    const transactions: Transaction[] = transactionsData.map((item: any) =>
      normalizeTransaction(item)
    );

    const expenses = transactions.filter((t) => t.type === "expense");
    const incomes = transactions.filter((t) => t.type === "income");
    console.log(
      `Found ${transactions.length} transactions: ${expenses.length} expenses, ${incomes.length} incomes`
    );

    // 更新緩存
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: transactions,
        timestamp: Date.now(),
      })
    );

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
export async function fetchMonthlySummary(
  userId: string,
  year: number,
  month: number
): Promise<{
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
        console.log(
          `Using cached summary data for ${userId} (${year}-${month})`
        );
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

    console.log(
      `Monthly summary for ${year}-${month}: Expense=${summary.totalExpense}, Income=${summary.totalIncome}, Balance=${summary.balance}`
    );

    // 更新緩存
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: summary,
        timestamp: Date.now(),
      })
    );

    return summary;
  } catch (error) {
    console.error("Error fetching monthly summary:", error);
    return { totalExpense: 0, totalIncome: 0, balance: 0 };
  }
}

/**
 * 獲取年度摘要
 * @param userId 用戶ID
 * @param year 年份
 * @returns 年度摘要數據
 */
export async function fetchYearlySummary(
  userId: string,
  year: number
): Promise<{
  totalExpense: number;
  totalIncome: number;
  balance: number;
}> {
  try {
    // 緩存鍵
    const cacheKey = `summary_${userId}_${year}_yearly`;

    // 檢查緩存
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      // 檢查緩存是否過期
      if ((Date.now() - timestamp) / 1000 < CACHE_DURATION) {
        console.log(`Using cached yearly summary data for ${userId} (${year})`);
        return data;
      }
    }

    // 獲取用戶該年的所有交易
    const transactions = await fetchTransactionsByUser(userId, year);

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

    console.log(
      `Yearly summary for ${year}: Expense=${summary.totalExpense}, Income=${summary.totalIncome}, Balance=${summary.balance}`
    );

    // 更新緩存
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: summary,
        timestamp: Date.now(),
      })
    );

    return summary;
  } catch (error) {
    console.error("Error fetching yearly summary:", error);
    return { totalExpense: 0, totalIncome: 0, balance: 0 };
  }
}

/**
 * 根據ID獲取交易詳情
 * @param id 交易ID
 * @param type 交易類型 ("income" | "expense")
 * @returns 交易詳情
 */
export async function fetchTransactionById(
  id: string,
  type: string
): Promise<Transaction | null> {
  try {
    // 構建 API URL - 現在使用統一的 transactions 表
    const url = `${SUPABASE_URL}/transactions?id=eq.${id}`;

    console.log("Making API request with:");
    console.log("URL:", url);
    console.log("Headers:", JSON.stringify(headers, null, 2));

    // 發送 API 請求
    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-cache", // 禁用緩存
    });

    console.log("Response status:", response.status);
    console.log("Response status text:", response.statusText);

    // 如果響應不成功，記錄更多信息
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response body:", errorText);
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`
      );
    }

    // 解析響應數據
    const data = await response.json();
    console.log("API response data:", JSON.stringify(data, null, 2));

    // 檢查是否有數據
    if (!data || data.length === 0) {
      console.log(`No transaction found with id ${id}`);
      return null;
    }

    // 獲取第一個結果並使用標準化函數處理
    const apiTransaction = data[0];
    // 確認類型匹配
    if (apiTransaction.type !== type) {
      console.log(
        `Transaction found but type (${apiTransaction.type}) does not match requested type (${type})`
      );
      return null;
    }

    const result = normalizeTransaction(apiTransaction);

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
export async function updateTransactionApi(
  transaction: Transaction
): Promise<boolean> {
  try {
    // 構建 API URL - 使用統一的 transactions 表
    const url = `${SUPABASE_URL}/transactions?id=eq.${transaction.id}`;

    // 準備要更新的數據 - 映射到 API 期望的字段名稱
    const updateData = {
      category: transaction.category,
      amount: Math.abs(transaction.amount), // 存儲絕對值
      type: transaction.type, // 現在需要明確儲存類型
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
      throw new Error(
        `Update API request failed with status ${response.status}: ${errorText}`
      );
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
    // 檢測是否在 LINE 內部瀏覽器中
    const isInLineInternalBrowser =
      typeof window !== "undefined" &&
      window.navigator.userAgent.includes("Line") &&
      !window.navigator.userAgent.includes("LIFF");

    // 如果在 LINE 內部瀏覽器中，嘗試從 localStorage 獲取用戶 ID
    if (isInLineInternalBrowser) {
      console.log(
        "In LINE internal browser, getting user ID from localStorage"
      );
      const storedUserId = localStorage.getItem("userId");
      if (storedUserId) {
        console.log("Found stored user ID:", storedUserId);
        return storedUserId;
      }
    }

    // 正常的 LIFF 流程
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

/**
 * 刪除交易
 * @param id 交易 ID
 * @param type 交易類型 - 僅用於日誌記錄和通知，不再用於選擇端點
 * @returns 是否成功
 */
export async function deleteTransactionApi(
  id: string,
  type: string
): Promise<boolean> {
  try {
    // 先獲取交易詳情，以便在刪除後發送通知
    const transaction = await fetchTransactionById(id, type);
    if (!transaction) {
      throw new Error(`Transaction with id ${id} and type ${type} not found`);
    }

    // 構建統一的 API URL
    const url = `${SUPABASE_URL}/transactions?id=eq.${id}`;

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
      throw new Error(
        `Delete API request failed with status ${response.status}: ${errorText}`
      );
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
  return `${year}年${month.toString().padStart(2, "0")}月${day
    .toString()
    .padStart(2, "0")}日`;
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
export function clearTransactionCache(
  userId: string,
  year?: number,
  month?: number
): void {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
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

      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
      console.log(
        `Cleared all cache for user ${userId}, removed ${keysToRemove.length} items`
      );
    }
  } catch (error) {
    console.error("Error clearing transaction cache:", error);
  }
}

/**
 * 格式化時間戳為可讀格式，將 UTC 時間轉換為台北時區 (UTC+8)，使用12小時制並顯示早上/下午/晚上
 * @param timestamp ISO 格式的時間戳
 * @returns 格式化後的時間字符串 (YYYY年MM月DD日 早上/下午/晚上 HH:MM)
 */
export function formatTimestamp(timestamp: string | undefined): string {
  if (!timestamp) return "";

  try {
    // 直接解析時間戳字符串，然後手動轉換為台北時區 (UTC+8)
    const match = timestamp.match(
      /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
    );

    if (!match) {
      return timestamp; // 如果無法解析，直接返回原始字符串
    }

    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    let hours24 = parseInt(match[4], 10);
    const minutes = match[5];

    // 將 UTC 時間轉換為台北時區 (UTC+8)
    hours24 = (hours24 + 8) % 24;

    // 如果小時加 8 後超過 24，日期需要加 1
    let adjustedDay = day;
    let adjustedMonth = month;
    let adjustedYear = year;

    if (parseInt(match[4], 10) + 8 >= 24) {
      // 需要進位到下一天
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      adjustedDay = day + 1;

      // 如果日期超過當月最後一天，月份加 1
      if (adjustedDay > lastDayOfMonth) {
        adjustedDay = 1;
        adjustedMonth = month + 1;

        // 如果月份超過 12，年份加 1
        if (adjustedMonth > 12) {
          adjustedMonth = 1;
          adjustedYear = year + 1;
        }
      }
    }

    // 轉換為12小時制並添加早上/下午/晚上標識
    let hours12 = hours24 % 12;
    if (hours12 === 0) hours12 = 12; // 12小時制中，0點顯示為12點

    let timePrefix = "";
    if (hours24 >= 0 && hours24 < 6) {
      timePrefix = "凌晨"; // 0:00-5:59
    } else if (hours24 >= 6 && hours24 < 12) {
      timePrefix = "早上"; // 6:00-11:59
    } else if (hours24 >= 12 && hours24 < 18) {
      timePrefix = "下午"; // 12:00-17:59
    } else {
      timePrefix = "晚上"; // 18:00-23:59
    }

    return `${adjustedYear}年${adjustedMonth
      .toString()
      .padStart(2, "0")}月${adjustedDay
      .toString()
      .padStart(2, "0")}日 ${timePrefix}${hours12}:${minutes}`;
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return timestamp; // 出錯時返回原始字符串
  }
}

/**
 * 創建新交易
 * @param transaction 交易數據
 * @returns 創建的交易ID
 */
export async function createTransactionApi(
  transaction: Omit<Transaction, "id">
): Promise<string | null> {
  try {
    // 使用統一的 transactions 表
    const url = `${SUPABASE_URL}/transactions`;

    // 準備數據
    const transactionData = {
      user_id: transaction.user_id,
      category: transaction.category,
      amount: Math.abs(transaction.amount), // 存儲絕對值
      type: transaction.type, // 指定類型
      datetime: parseDateToISOString(transaction.date),
      memo: transaction.note,
      is_fixed: transaction.isFixed || false,
      frequency: transaction.fixedFrequency,
      interval: transaction.fixedInterval,
    };

    console.log("Creating new transaction:", transactionData);

    // 發送 POST 請求
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "return=representation",
      },
      body: JSON.stringify(transactionData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error creating transaction:", errorText);
      throw new Error(
        `Create transaction failed with status ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error("No data returned after creating transaction");
    }

    const createdId = data[0].id;
    console.log("Transaction created with ID:", createdId);

    // 清除緩存
    const match = transaction.date.match(/(\d+)年(\d+)月(\d+)日/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);

      // 獲取用戶ID
      const userId = transaction.user_id;
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

    return createdId;
  } catch (error) {
    console.error("Error in createTransactionApi:", error);
    return null;
  }
}
