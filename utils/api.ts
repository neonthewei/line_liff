import { Transaction } from "@/types/transaction";
import { sendUpdateNotification, sendDeleteNotification } from "./line-messaging";

// Supabase API 配置
const SUPABASE_URL = "https://hsezmdybryhvtmfagpwz.supabase.co/rest/v1";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZXptZHlicnlodnRtZmFncHd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTAyMDM0NCwiZXhwIjoyMDU2NTk2MzQ0fQ.ztdHl2lXh5ncQmGvCcPHA4KUF0mOMVKzeATUEE5dKy4";

// API 請求頭
const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
};

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
    
    return true;
  } catch (error) {
    console.error("Error updating transaction:", error);
    return false;
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
    
    return true;
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return false;
  }
}

/**
 * 將日期格式化為 "YYYY年MM月DD日" 格式
 * @param dateString ISO 日期字符串
 * @returns 格式化後的日期字符串
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}年${month}月${day}日`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return new Date().toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replace(/\//g, "年").replace(/\//g, "月") + "日";
  }
}

/**
 * 將 "YYYY年MM月DD日" 格式的日期解析為 ISO 字符串
 * @param formattedDate 格式化的日期字符串
 * @returns ISO 日期字符串
 */
function parseDateToISOString(formattedDate: string): string {
  try {
    const match = formattedDate.match(/(\d+)年(\d+)月(\d+)日/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1; // JavaScript 月份從 0 開始
      const day = parseInt(match[3]);
      const date = new Date(year, month, day);
      return date.toISOString();
    }
    return new Date().toISOString();
  } catch (error) {
    console.error("Error parsing date:", error);
    return new Date().toISOString();
  }
} 