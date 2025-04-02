import { useState, useEffect } from "react";
import { RecurringTransaction, GroupedTransactions } from "./types";
import { SUPABASE_URL, SUPABASE_KEY } from "@/utils/api";

// Hook to fetch recurring transactions
export const useRecurringTransactions = (userId: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [groupedTransactions, setGroupedTransactions] =
    useState<GroupedTransactions>({
      expenses: [],
      incomes: [],
    });

  // Fetch recurring transactions from Supabase
  useEffect(() => {
    const fetchRecurringTransactions = async () => {
      try {
        setIsLoading(true);

        if (!SUPABASE_URL || !SUPABASE_KEY) {
          throw new Error("Supabase credentials not found");
        }

        // Fetch data from the recurring table - Fixed URL to avoid duplication of rest/v1
        const response = await fetch(
          `${SUPABASE_URL}/recurring?user_id=eq.${userId}&order=created_at.desc`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_KEY,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch recurring transactions: ${response.statusText}`
          );
        }

        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Error fetching recurring transactions:", error);
        setError(
          "Failed to load recurring transactions. Please try again later."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecurringTransactions();
  }, [userId]);

  // Group transactions by type whenever the transactions array changes
  useEffect(() => {
    const grouped = transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === "expense") {
          acc.expenses.push(transaction);
        } else {
          acc.incomes.push(transaction);
        }
        return acc;
      },
      {
        expenses: [] as RecurringTransaction[],
        incomes: [] as RecurringTransaction[],
      }
    );

    setGroupedTransactions(grouped);
  }, [transactions]);

  // Generate recurring transactions for a specific user
  const generateRecurringTransactionsForUser = async (userId: string) => {
    try {
      console.log("🔄 準備為用戶生成固定收支交易:", userId);

      // 調用我們的 API 端點
      console.log("📡 發送請求到本地 API 端點");

      // 使用 POST 請求
      const response = await fetch("/api/generate-recurring-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      // 記錄響應狀態
      console.log(`🔍 API 響應狀態: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // 獲取錯誤響應體
        let errorBody = "";
        try {
          const errorResponse = await response.json();
          errorBody = JSON.stringify(errorResponse);
          console.error("❌ 錯誤響應體:", errorResponse);
        } catch (e) {
          errorBody = "Could not read error response body";
          console.error("❌ 無法讀取錯誤響應體");
        }

        console.error("❌ 生成固定收支交易失敗:", {
          status: response.status,
          statusText: response.statusText,
          errorBody,
        });

        // 嘗試使用 GET 請求
        console.log("⚠️ 嘗試使用 GET 請求...");
        const getResponse = await fetch(
          `/api/generate-recurring-transactions?userId=${encodeURIComponent(
            userId
          )}`
        );

        if (!getResponse.ok) {
          console.error("❌ GET 請求也失敗");
          return false;
        }

        const getData = await getResponse.json();
        console.log("✅ GET 請求成功:", getData);
        return true;
      }

      // 嘗試獲取並記錄響應數據
      try {
        const responseData = await response.json();
        console.log("✅ 成功生成固定收支交易，響應數據:", responseData);
      } catch (e) {
        // 如果沒有 JSON 響應或為空，只記錄成功消息
        console.log("✅ 成功生成固定收支交易，無響應數據");
      }

      console.log("✅ 已完成用戶的固定收支交易更新:", userId);
      return true;
    } catch (error) {
      console.error("❌ 生成固定收支交易時發生錯誤:", error);
      return false;
    }
  };

  return {
    isLoading,
    transactions,
    error,
    setTransactions,
    groupedTransactions,
    generateRecurringTransactionsForUser,
  };
};

// Create a new empty transaction template
export const createEmptyTransaction = (
  userId: string
): RecurringTransaction => {
  const today = new Date().toISOString().split("T")[0]; // Format as YYYY-MM-DD
  return {
    id: `temp-${Date.now()}`, // Temporary ID that will be replaced by the database
    user_id: userId,
    memo: "",
    amount: 0,
    type: "expense",
    start_date: today,
    interval: "monthly",
    frequency: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};
