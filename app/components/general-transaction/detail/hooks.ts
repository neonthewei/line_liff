import { useState, useEffect, useMemo } from "react";
import type { Transaction } from "@/types/transaction";
import { Category } from "./types";
import { defaultCategories, defaultTransaction } from "./constants";
import { getUserIdFromLiff } from "./utils";
import {
  fetchTransactionById,
  updateTransactionApi,
  deleteTransactionApi,
} from "@/utils/api";
import { SUPABASE_URL, SUPABASE_KEY } from "@/utils/api";

// 交易管理 Hook
export function useTransaction(
  transactionId: string | null,
  userId: string | null
) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [originalTransaction, setOriginalTransaction] =
    useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!transactionId) {
      setIsLoading(false);
      return;
    }

    async function loadTransaction() {
      try {
        setIsLoading(true);

        console.log(`Fetching transaction with ID: ${transactionId}`);
        // 這裡我們已經檢查了 transactionId 不為 null，可以安全地斷言其類型
        const data = await fetchTransactionById(transactionId as string);

        if (data) {
          console.log("Transaction data retrieved successfully:", data);
          // 確保設置 user_id
          const transactionWithUserId: Transaction = {
            ...data,
            user_id: userId || data.user_id || "", // 優先使用 LIFF 的 user_id
            // 確保必需屬性存在
            isFixed: data.isFixed ?? false,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
          };
          setTransaction(transactionWithUserId);
          setOriginalTransaction(transactionWithUserId);
        } else {
          // 如果找不到數據，返回 null
          console.warn("Transaction not found");
          setTransaction(null);
          setOriginalTransaction(null);
        }
      } catch (error) {
        console.error("Error loading transaction:", error);
        // 發生錯誤時也返回 null
        setTransaction(null);
        setOriginalTransaction(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadTransaction();
  }, [transactionId, userId]);

  // 檢查交易是否有變更
  const hasChanges = useMemo(() => {
    if (!transaction || !originalTransaction) return false;

    return (
      transaction.type !== originalTransaction.type ||
      transaction.category !== originalTransaction.category ||
      transaction.amount !== originalTransaction.amount ||
      transaction.date !== originalTransaction.date ||
      transaction.note !== originalTransaction.note
    );
  }, [transaction, originalTransaction]);

  return {
    transaction,
    setTransaction,
    originalTransaction,
    isLoading,
    hasChanges,
  };
}

// 類別管理 Hook
export function useCategories(
  userId: string | null,
  transactionType: "income" | "expense"
) {
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 從資料庫獲取類別
  const fetchCategoriesFromDb = async () => {
    if (!userId) {
      setCategories(defaultCategories);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // 構建 API URL 避免 rest/v1 路徑重複
      const url = `${SUPABASE_URL}/categories?or=(user_id.eq.${userId},user_id.is.null)`;

      // 發送 API 請求
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }

      const data = await response.json();

      // Log categories before filtering
      console.log("Fetched categories before filtering:", data);

      // 先找出用戶已刪除的類別名稱（包括系統預設類別）
      const userDeletedCategoryNames = data
        .filter((cat: Category) => cat.user_id === userId && cat.is_deleted)
        .map((cat: Category) => cat.name);

      console.log("User deleted category names:", userDeletedCategoryNames);

      // 過濾類別:
      // 1. 包含未刪除的用戶自定義類別
      // 2. 包含未被用戶刪除的系統預設類別
      const filteredCategories = data.filter(
        (cat: Category) =>
          // 用戶自定義類別 - 未刪除的
          (cat.user_id === userId && !cat.is_deleted) ||
          // 系統預設類別 - 未被用戶刪除的
          (cat.user_id === null && !userDeletedCategoryNames.includes(cat.name))
      );

      console.log("Fetched categories after filtering:", filteredCategories);
      setDbCategories(filteredCategories);

      // 更新類別名稱列表
      updateCategoryNamesByType(filteredCategories, transactionType);
    } catch (error) {
      console.error("Error fetching categories:", error);
      // 如果獲取失敗，使用預設類別
      setCategories(defaultCategories);
    } finally {
      setIsLoading(false);
    }
  };

  // 根據交易類型更新類別名稱列表
  const updateCategoryNamesByType = (
    cats: Category[],
    type: "income" | "expense"
  ) => {
    // 先過濾出符合交易類型的類別
    const filteredCategories = cats.filter((cat) => cat.type === type);

    // 分離系統預設類別和用戶自訂類別
    const defaultCats = filteredCategories.filter(
      (cat) => cat.user_id === null
    );
    const userCats = filteredCategories.filter((cat) => cat.user_id === userId);

    // 對用戶自訂類別按照創建時間排序（從舊到新，最新的在最後）
    userCats.sort((a, b) => {
      // 如果 created_at 不存在，將其視為最早的類別
      if (!a.created_at) return -1;
      if (!b.created_at) return 1;

      // 從舊到新排序（最新的在最後）
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    // 合併類別名稱列表：先顯示系統預設類別，再顯示按時間排序的用戶自訂類別
    const categoryNames = [
      ...defaultCats.map((cat) => cat.name),
      ...userCats.map((cat) => cat.name),
    ];

    // 如果沒有找到任何類別，使用預設類別
    if (categoryNames.length === 0) {
      setCategories(defaultCategories);
    } else {
      setCategories(categoryNames);
    }
  };

  // 當用戶 ID 或交易類型變更時，重新獲取類別
  useEffect(() => {
    fetchCategoriesFromDb();
  }, [userId, transactionType]);

  // 當交易類型變更時，更新類別列表
  useEffect(() => {
    if (dbCategories.length > 0) {
      updateCategoryNamesByType(dbCategories, transactionType);
    }
  }, [transactionType, dbCategories]);

  return {
    categories,
    setCategories,
    dbCategories,
    setDbCategories,
    fetchCategoriesFromDb,
    updateCategoryNamesByType,
    isLoading,
  };
}

// Toast 通知 Hook
export function useToast() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // 顯示 Toast 通知的輔助函數
  const showToastNotification = (
    message: string,
    type: "success" | "error" = "success",
    duration = 3000,
    callback?: () => void
  ) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);

    // 延長顯示時間，確保動畫有足夠時間完成
    setTimeout(() => {
      setShowToast(false);
      if (callback) {
        // 為回調函數添加額外延遲，確保淡出動畫完成後再執行
        setTimeout(() => {
          callback();
        }, 300);
      }
    }, duration);
  };

  return {
    showToast,
    toastMessage,
    toastType,
    showToastNotification,
  };
}

// 調試資訊 Hook
export function useDebugInfo() {
  const [debugClickCount, setDebugClickCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<{
    url: string;
    params: Record<string, string>;
  }>({ url: "", params: {} });

  const incrementDebugClickCount = () => {
    setDebugClickCount((prev) => prev + 1);
  };

  return {
    debugClickCount,
    debugInfo,
    setDebugInfo,
    incrementDebugClickCount,
  };
}
