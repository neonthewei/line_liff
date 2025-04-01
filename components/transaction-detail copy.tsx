"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  initializeLiff,
  closeLiff,
  getLiffUrlParams,
  navigateInLiff,
} from "@/utils/liff";
import liff from "@line/liff";
import { Transaction } from "./transaction/shared/types";
import {
  useTransaction,
  useCategories,
  useToast,
  useDebugInfo,
} from "./transaction/shared/hooks";
import { BYPASS_LIFF } from "./transaction/shared/constants";
import { getUserIdFromLiff } from "./transaction/shared/utils";
import {
  updateTransactionApi,
  deleteTransactionApi,
  clearTransactionCache,
  parseDateToISOString,
  formatTimestamp,
  fetchTransactionsByCategory,
  batchDeleteTransactions,
  fetchTransactionById,
} from "@/utils/api";
import { SUPABASE_URL, SUPABASE_KEY } from "@/utils/api";

// Import modular components from transaction/detail
import { Type } from "./transaction/detail/type";
import { Category } from "./transaction/detail/category";
import { Amount } from "./transaction/detail/amount";
import { DatePicker } from "./transaction/detail/date";
import { Note } from "./transaction/detail/note";
import { ActionButtons, DeleteModal } from "./transaction/detail/buttons";
import { Toast } from "./transaction/detail/toast";
import { Skeleton } from "./transaction/detail/skeleton";
import { Debug } from "./transaction/detail/debug";

// Define the component props interface
interface TransactionDetailProps {
  transaction?: Transaction; // Optional direct transaction object
  onError?: () => void;
  onUpdate?: (updatedTransaction: Transaction) => void;
  onDelete?: () => void;
  onBack?: () => void;
}

export default function TransactionDetail({
  transaction: initialTransaction,
  onError,
  onUpdate,
  onDelete,
  onBack,
}: TransactionDetailProps) {
  // 初始化相關狀態
  const [isLiffInitialized, setIsLiffInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(
    initialTransaction?.user_id || null
  );
  const [transactionId, setTransactionId] = useState<string | null>(
    initialTransaction?.id || null
  );
  const [isMounted, setIsMounted] = useState(false);
  const [isButtonsDisabled, setIsButtonsDisabled] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isCategoryEditMode, setIsCategoryEditMode] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedCategoryForDelete, setSelectedCategoryForDelete] =
    useState("");
  const [transactionCount, setTransactionCount] = useState(0);

  // 路由
  const router = useRouter();

  // 使用自定義 hooks
  const { debugClickCount, debugInfo, setDebugInfo, incrementDebugClickCount } =
    useDebugInfo();

  const { showToast, toastMessage, toastType, showToastNotification } =
    useToast();

  // 基于原始showToastNotification创建支持更多类型的通知函数
  const showNotification = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "success",
    duration = 3000,
    callback?: () => void
  ) => {
    // 将类型映射到支持的类型
    const mappedType: "success" | "error" =
      type === "warning" || type === "info" ? "error" : type;

    // 调用原始函数
    showToastNotification(message, mappedType, duration, callback);
  };

  // 當獲取到交易 ID 後使用 useTransaction hook
  const {
    transaction,
    setTransaction,
    originalTransaction,
    isLoading,
    hasChanges,
  } = useTransaction(transactionId, userId);

  // 當獲取到交易資料後使用 useCategories hook
  const {
    categories,
    dbCategories,
    setDbCategories,
    fetchCategoriesFromDb,
    updateCategoryNamesByType,
  } = useCategories(userId, transaction?.type || "expense");

  // 標記組件為已掛載
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 如果直接傳入了 transaction，則直接使用它
  useEffect(() => {
    if (initialTransaction && !transaction) {
      // 手動設置 transaction 數據
      if (setTransaction) {
        setTransaction(initialTransaction);
      }

      // 同步設置 user_id 和 transaction_id
      setUserId(initialTransaction.user_id);
      setTransactionId(initialTransaction.id);

      // 跳過初始化過程
      setIsInitializing(false);
    }
  }, [initialTransaction, transaction, setTransaction]);

  // 初始化 LIFF 和獲取數據 - 只在沒有直接傳入 transaction 時執行
  useEffect(() => {
    // 如果已經通過 props 獲得 transaction，則跳過 LIFF 初始化
    if (initialTransaction || !isMounted) return;

    // Only set initializing to true if it's not already in a loading state
    let isStartingInitialization = true;

    async function initialize() {
      try {
        console.log("Initializing transaction detail component");
        console.log("Current URL:", window.location.href);

        // 初始化 LIFF
        const liffInitialized = await initializeLiff();
        console.log("LIFF initialization result:", liffInitialized);
        setIsLiffInitialized(liffInitialized);

        // 檢查 LIFF 是否已登入，如果未登入或 token 已過期，則重新登入
        if (liffInitialized && !BYPASS_LIFF && typeof liff !== "undefined") {
          try {
            // 嘗試獲取 access token 來檢查是否有效
            const token = liff.getAccessToken();
            if (!token) {
              console.log("No access token found, attempting to login");
              liff.login();
              return;
            }
            console.log("Access token exists, continuing");
          } catch (tokenError) {
            console.error(
              "Error getting access token, may be expired:",
              tokenError
            );
            console.log("Attempting to re-login");
            try {
              liff.login();
              return;
            } catch (loginError) {
              console.error("Failed to re-login:", loginError);
            }
          }
        }

        // 獲取用戶ID
        const userId = await getUserIdFromLiff();
        if (!userId && !BYPASS_LIFF) {
          console.error("No user ID available");
          setIsInitializing(false);
          if (onError) onError();
          return;
        }

        setUserId(userId);

        // 獲取 URL 參數
        const params = getLiffUrlParams();
        setDebugInfo({ url: window.location.href, params });

        // 獲取交易 ID
        let id = params.id;

        // 如果沒有從 URL 參數獲取到 ID，嘗試從 URL 路徑獲取
        if (!id) {
          console.log("No ID in URL parameters, trying to extract from path");
          try {
            const pathParts = window.location.pathname.split("/");
            if (
              pathParts.length > 2 &&
              pathParts[1] === "transaction" &&
              pathParts[2]
            ) {
              id = pathParts[2];
              console.log("Extracted ID from URL path:", id);
            }
          } catch (pathError) {
            console.error("Failed to extract ID from path:", pathError);
          }
        }

        // 如果仍然沒有 ID，嘗試從 localStorage 獲取
        if (!id) {
          console.log("Still no ID, trying localStorage");
          try {
            const storedId = localStorage.getItem("lastTransactionId");
            if (storedId) {
              id = storedId;
              console.log("Retrieved ID from localStorage:", id);
            }
          } catch (storageError) {
            console.error("Failed to access localStorage:", storageError);
          }
        }

        if (!id) {
          console.error("No transaction ID provided");
          setIsInitializing(false);
          if (onError) onError();
          return;
        }

        // 設置交易 ID，這會觸發 useTransaction hook
        setTransactionId(id);
      } catch (error) {
        console.error("Error initializing:", error);
        setIsInitializing(false);
        if (onError) onError();
      }
    }

    if (isStartingInitialization) {
      setIsInitializing(true);
      isStartingInitialization = false;
    }

    initialize();
  }, [isMounted, onError, initialTransaction, setTransactionId, setDebugInfo]);

  // 當 transaction 加載完成時，結束初始化加載狀態
  useEffect(() => {
    // 只有當 transactionId 已設置且不在加載中時，才結束初始化
    if (transactionId && !isLoading) {
      setIsInitializing(false);
    }
  }, [transactionId, isLoading]);

  // 防止意外點擊的延遲
  useEffect(() => {
    if (isMounted) {
      const timer = setTimeout(() => {
        setIsButtonsDisabled(false);
      }, 300); // 300ms 延遲

      return () => clearTimeout(timer);
    }
  }, [isMounted]);

  // 處理交易類型變更
  const handleTypeChange = async (type: "expense" | "income") => {
    if (!transaction) return;

    // 如果類型沒有變化，不做任何操作
    if (transaction.type === type) return;

    // 更新本地交易對象的類型和金額
    const updatedTransaction = {
      ...transaction,
      type,
      amount:
        type === "expense"
          ? -Math.abs(transaction.amount)
          : Math.abs(transaction.amount),
      // 重置類別，因為不同類型有不同的類別選項
      category: "",
    };

    // 更新本地狀態
    setTransaction(updatedTransaction);

    // 自動展開類型選擇區域
    setIsEditingCategory(true);

    // 顯示提示通知
    showNotification("請選擇一個類型", "success", 2000);
  };

  // 導航回列表頁的輔助函數
  const navigateBackToList = () => {
    // 如果提供了 onBack 回調，優先使用它
    if (onBack) {
      onBack();
      return;
    }

    // 否則使用默認的導航邏輯
    // 檢查是否在 LINE 環境中
    if (typeof window !== "undefined") {
      // 檢查是否是從 LINE LIFF 打開的
      const isFromLiff =
        window.location.href.includes("liff.line.me") ||
        (liff.isInClient && liff.isInClient());

      console.log("Is from LIFF:", isFromLiff);
      console.log("Current URL:", window.location.href);

      if (isFromLiff) {
        // 如果是從 LINE LIFF 打開的，使用 closeLiff() 關閉視窗
        console.log("Closing LIFF window");
        closeLiff();
      } else {
        // 如果不是從 LINE LIFF 打開的，使用普通導航
        console.log("Using normal navigation");
        window.location.href = "/";
      }
    } else {
      // 在 SSR 環境中，使用 router 導航
      router.push("/");
    }
  };

  // 處理刪除
  const handleDelete = () => {
    // 顯示確認視窗
    setShowDeleteModal(true);
  };

  // 確認刪除交易
  const confirmDelete = async () => {
    if (!transaction) return;
    try {
      // 關閉確認視窗
      setShowDeleteModal(false);

      const success = await deleteTransactionApi(
        transaction.id,
        transaction.type
      );

      if (success) {
        // 如果提供了 onDelete 回調，優先使用它
        if (onDelete) {
          onDelete();
          return;
        }

        // 否則顯示成功通知並導航回列表
        showNotification("刪除成功", "success", 800, navigateBackToList);
      } else {
        showNotification("刪除失敗，請稍後再試", "error");
      }
    } catch (error) {
      console.error("刪除交易失敗", error);
      showNotification("刪除失敗，請稍後再試", "error");
    }
  };

  // 取消刪除
  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  // 處理確認/更新
  const handleConfirm = async () => {
    if (!transaction) return;

    // 如果沒有變更，直接返回，不顯示通知
    if (!hasChanges) {
      navigateBackToList();
      return;
    }

    // 驗證類別是否已選擇
    if (!transaction.category) {
      showNotification("請選擇一個類型", "error", 2000);
      setIsEditingCategory(true);
      return;
    }

    try {
      // 檢查交易類型是否與原始類型不同
      const originalType = originalTransaction?.type || "expense";
      const hasTypeChanged = transaction.type !== originalType;

      if (hasTypeChanged) {
        // 如果類型已更改，需要刪除舊交易並創建新交易
        console.log("交易類型已變更，刪除舊交易並創建新交易");

        // 先刪除原有的交易
        const deleteSuccess = await deleteTransactionApi(
          transaction.id,
          originalType
        );

        if (!deleteSuccess) {
          showNotification("儲存失敗，請稍後再試", "error");
          return;
        }

        // 構建 API URL - 使用統一的 transactions 表
        const url = `${SUPABASE_URL}/transactions`;

        // 準備要創建的數據
        const createData: any = {
          user_id: transaction.user_id,
          category: transaction.category,
          amount: Math.abs(transaction.amount),
          type: transaction.type, // 明確指定類型
          datetime: parseDateToISOString(transaction.date),
          memo: transaction.note || "",
          is_fixed: transaction.isFixed || false,
        };

        if (transaction.isFixed) {
          createData.frequency = transaction.fixedFrequency;
          createData.interval = transaction.fixedInterval;
        }

        console.log("創建新交易:", createData);

        // 發送 API 請求創建新交易
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Prefer: "return=representation",
          },
          body: JSON.stringify(createData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("創建交易失敗:", errorText);
          showNotification("儲存失敗，請稍後再試", "error");
          return;
        }

        // 解析響應數據
        const data = await response.json();
        if (!data || data.length === 0) {
          showNotification("儲存失敗，請稍後再試", "error");
          return;
        }

        // 清除快取
        const match = transaction.date.match(/(\d+)年(\d+)月(\d+)日/);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]);
          clearTransactionCache(transaction.user_id, year, month);
        }

        // 如果提供了 onUpdate 函數，則調用它
        if (onUpdate) {
          const updatedTransaction: Transaction = {
            ...transaction,
            id: data[0].id,
          };
          onUpdate(updatedTransaction);
          showNotification("儲存成功", "success");

          // 給 UI 一點時間更新，然後再返回
          setTimeout(navigateBackToList, 800);
          return;
        }

        // 否則，使用默認的導航邏輯
        showNotification("儲存成功", "success", 800, navigateBackToList);
      } else {
        // 如果類型沒有變化，使用正常的更新流程
        const success = await updateTransactionApi(transaction);

        if (success) {
          // 清除快取
          const match = transaction.date.match(/(\d+)年(\d+)月(\d+)日/);
          if (match) {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]);
            clearTransactionCache(transaction.user_id, year, month);
          }

          // 如果提供了 onUpdate 函數，則調用它
          if (onUpdate) {
            onUpdate(transaction);
            showNotification("儲存成功", "success");

            // 給 UI 一點時間更新，然後再返回
            setTimeout(navigateBackToList, 800);
            return;
          }

          // 否則，使用默認的導航邏輯
          showNotification("儲存成功", "success", 800, navigateBackToList);
        } else {
          showNotification("儲存失敗，請稍後再試", "error");
        }
      }
    } catch (error) {
      console.error("儲存交易失敗", error);
      showNotification("儲存失敗，請稍後再試", "error");
    }
  };

  // 處理類別相關操作
  const handleSelectCategory = async (category: string) => {
    if (!transaction) return;
    const updatedTransaction = { ...transaction, category };
    setTransaction(updatedTransaction);
  };

  const handleToggleCategoryEditMode = () => {
    setIsCategoryEditMode(!isCategoryEditMode);
    if (!isCategoryEditMode) {
      setIsAddingCategory(false);
    }
  };

  const handleAddCategory = () => {
    setIsAddingCategory(true);
    setNewCategory("");
    // 自動展開類別選擇區域（如果尚未展開）
    setIsEditingCategory(true);
  };

  const handleSaveNewCategory = async (categoryName: string) => {
    if (!categoryName || categoryName.trim() === "") return;

    // 設置本地state以保持同步
    setNewCategory(categoryName);

    // 檢查類別是否已存在
    if (categories.includes(categoryName.trim())) {
      showNotification("此類別已存在", "error");
      return;
    }

    // 添加到資料庫
    if (transaction) {
      const success = await addCategoryToDatabase(
        categoryName.trim(),
        transaction.type
      );

      if (success) {
        // 更新本地類別列表 - 已在 hook 中處理
        // 如果不在編輯模式，自動選擇新類別
        if (!isCategoryEditMode) {
          handleSelectCategory(categoryName.trim());
        }

        showNotification("新增類別成功", "success");
      } else {
        showNotification("新增類別失敗，請稍後再試", "error");
      }
    }

    setIsAddingCategory(false);
  };

  // 添加获取类型交易数量的方法
  const getCategoryTransactionCount = async (
    category: string
  ): Promise<number> => {
    try {
      if (!transaction) return 0;

      // 使用当前交易的用户ID
      const userId = transaction.user_id;
      if (!userId) {
        return 0;
      }

      // 查询该类型的交易记录
      const transactions = await fetchTransactionsByCategory(userId, category);
      return transactions.length;
    } catch (error) {
      console.error("Error getting category transaction count:", error);
      return 0;
    }
  };

  // 刪除類別 - 修改自 detail copy
  const handleDeleteCategory = async (categoryToDelete: string) => {
    // 不允許刪除當前選中的類別
    if (transaction && categoryToDelete === transaction.category) {
      showNotification("無法刪除當前使用中的類別", "error");
      return;
    }

    try {
      if (!transaction) return;

      // 獲取用戶ID
      const userId = transaction.user_id;
      if (!userId) {
        showNotification("無法獲取用戶ID，請重新登入", "error");
        return;
      }

      // 首先获取该类型的所有交易记录
      const categoryTransactions = await fetchTransactionsByCategory(
        userId,
        categoryToDelete
      );

      console.log(`====== 準備刪除類型: "${categoryToDelete}" ======`);
      console.log(`找到 ${categoryTransactions.length} 筆相關交易記錄`);

      // 打印詳細的交易記錄信息
      if (categoryTransactions.length > 0) {
        console.log("以下交易記錄將被刪除:");
        categoryTransactions.forEach((tx, index) => {
          console.log(`[${index + 1}] ID: ${tx.id}`);
          console.log(`    日期: ${tx.date}`);
          console.log(`    類型: ${tx.type === "expense" ? "支出" : "收入"}`);
          console.log(`    金額: ${Math.abs(tx.amount)}`);
          console.log(`    備註: ${tx.note || "(無)"}`);
          console.log(`    ---------------------`);
        });
      } else {
        console.log("沒有找到相關交易記錄，只刪除類型定義");
      }

      // 找到要刪除的類別
      const categoryToRemove = dbCategories.find(
        (cat) => cat.name === categoryToDelete
      );

      if (categoryToRemove) {
        // 设置加载状态
        showNotification(`正在處理中...`, "info");

        // 1. 首先删除所有相关交易
        let deleteResult = { success: true, deletedCount: 0 };
        const deletedTransactions: string[] = [];
        const failedTransactions: string[] = [];

        if (categoryTransactions.length > 0) {
          const transactionIds = categoryTransactions.map((t) => t.id);
          deleteResult = await batchDeleteTransactions(transactionIds);

          // 記錄哪些交易被成功刪除
          const results = await Promise.allSettled(
            transactionIds.map(async (id, idx) => {
              try {
                // 嘗試獲取交易記錄，如果獲取不到則表示已被刪除
                const tx = await fetchTransactionById(id);
                if (!tx) {
                  deletedTransactions.push(
                    `${categoryTransactions[idx].date} ${Math.abs(
                      categoryTransactions[idx].amount
                    )}元`
                  );
                  return true;
                } else {
                  failedTransactions.push(id);
                  return false;
                }
              } catch (error) {
                // 如果出錯，假設交易已被刪除
                deletedTransactions.push(
                  `${categoryTransactions[idx].date} ${Math.abs(
                    categoryTransactions[idx].amount
                  )}元`
                );
                return true;
              }
            })
          );

          console.log(`====== 交易記錄刪除結果 ======`);
          console.log(
            `成功刪除: ${deleteResult.deletedCount}/${categoryTransactions.length} 筆交易`
          );

          if (deletedTransactions.length > 0) {
            console.log("成功刪除的交易:");
            deletedTransactions.forEach((tx, idx) => {
              console.log(`[${idx + 1}] ${tx}`);
            });
          }

          if (failedTransactions.length > 0) {
            console.log("刪除失敗的交易ID:");
            failedTransactions.forEach((id, idx) => {
              console.log(`[${idx + 1}] ${id}`);
            });
          }
        }

        // 2. 然后删除类型
        let categoryDeleteSuccess = false;
        if (categoryToRemove.user_id === null) {
          // 系統預設類別 - 創建一個標記為已刪除的記錄
          const url = `${SUPABASE_URL}/categories`;

          // 準備要創建的數據 - 創建一個與系統預設同名但標記為已刪除的用戶特定記錄
          const createData = {
            user_id: userId,
            name: categoryToRemove.name,
            type: categoryToRemove.type,
            is_deleted: true,
          };

          // 發送 API 請求創建"刪除標記"記錄
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_KEY,
              Prefer: "return=representation",
            },
            body: JSON.stringify(createData),
          });

          categoryDeleteSuccess = response.ok;
          if (!categoryDeleteSuccess) {
            const errorText = await response.text();
            console.error(
              "Create delete marker error response body:",
              errorText
            );
          }
        } else {
          // 用戶自定義類別 - 直接從資料庫刪除
          const url = `${SUPABASE_URL}/categories?id=eq.${categoryToRemove.id}`;

          // 發送 API 請求刪除類別
          const response = await fetch(url, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_KEY,
              Prefer: "return=minimal",
            },
          });

          categoryDeleteSuccess = response.ok;
          if (!categoryDeleteSuccess) {
            const errorText = await response.text();
            console.error("Delete category error response body:", errorText);
          }
        }

        console.log(`====== 類型刪除結果 ======`);
        console.log(
          `類型 "${categoryToDelete}" ${
            categoryDeleteSuccess ? "刪除成功" : "刪除失敗"
          }`
        );
        console.log(`====== 刪除操作完成 ======`);

        // 重新獲取類別列表
        await fetchCategoriesFromDb();

        // 顯示結果通知
        if (categoryDeleteSuccess) {
          if (categoryTransactions.length > 0) {
            if (deleteResult.success) {
              // 构建删除交易的详细信息字符串
              let deletedDetailsMsg = `類型及其 ${deleteResult.deletedCount} 筆交易已刪除`;
              // 如果删除的交易数量不多，可以显示详细信息
              if (
                deletedTransactions.length > 0 &&
                deletedTransactions.length <= 3
              ) {
                deletedDetailsMsg += `\n包括: ${deletedTransactions.join(
                  ", "
                )}`;
              }
              showNotification(deletedDetailsMsg, "success");
            } else if (deleteResult.deletedCount > 0) {
              showNotification(
                `類型已刪除，但部分交易（${deleteResult.deletedCount}/${categoryTransactions.length}）刪除失敗`,
                "warning"
              );
            } else {
              showNotification("類型已刪除，但交易記錄刪除失敗", "warning");
            }
          } else {
            showNotification("類型已刪除", "success");
          }
        } else {
          showNotification("刪除類型失敗，請稍後再試", "error");
        }
      } else {
        // 如果找不到類別 (也許是本地測試數據)，只需更新本地狀態
        if (transaction) {
          updateCategoryNamesByType(dbCategories, transaction.type);
        }
        showNotification("類型已刪除", "success");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      showNotification("刪除類型失敗，請稍後再試", "error");
    }
  };

  // 添加類別到資料庫 - 修改自 detail copy
  const addCategoryToDatabase = async (
    categoryName: string,
    type: "income" | "expense"
  ) => {
    try {
      if (!transaction) {
        console.error("Transaction is null when adding category");
        return false;
      }

      // 構建 API URL
      const url = `${SUPABASE_URL}/categories`;

      // 準備要創建的數據
      const createData = {
        user_id: transaction.user_id,
        name: categoryName,
        type: type,
        is_deleted: false,
      };

      // 發送 API 請求創建新類別
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Prefer: "return=representation",
        },
        body: JSON.stringify(createData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Create category error response body:", errorText);
        return false;
      }

      // 解析響應數據
      const data = await response.json();
      if (!data || data.length === 0) {
        return false;
      }

      // 更新本地類別列表
      const newCategory = data[0];
      setDbCategories((prev) => [...prev, newCategory]);

      // 重新獲取類別列表
      await fetchCategoriesFromDb();

      return true;
    } catch (error) {
      console.error("Error adding category to database:", error);
      return false;
    }
  };

  // 更新金額
  const handleAmountChange = (amount: number) => {
    if (!transaction) return;
    const updatedTransaction = { ...transaction, amount };
    setTransaction(updatedTransaction);
  };

  // 更新日期
  const handleDateChange = (date: string) => {
    if (!transaction) return;
    const updatedTransaction = { ...transaction, date };
    setTransaction(updatedTransaction);
  };

  // 更新備註
  const handleNoteChange = (note: string) => {
    if (!transaction) return;
    const updatedTransaction = { ...transaction, note };
    setTransaction(updatedTransaction);
  };

  // 渲染加載狀態
  if (isInitializing || isLoading) return <Skeleton />;

  // 渲染錯誤狀態 (找不到交易)
  if (!transaction)
    return (
      <div className="w-full max-w-md mx-auto p-4 flex flex-col justify-center items-center h-screen">
        <div
          className="fixed inset-0 z-0"
          onClick={() => incrementDebugClickCount()}
        />
        <div className="text-center">
          <div className="text-xl font-medium text-gray-700 mb-8">
            找不到該筆交易
          </div>
        </div>

        {/* 調試信息 - 點擊五次才會顯示 */}
        {debugClickCount >= 5 && <Debug info={debugInfo} />}
      </div>
    );

  // 渲染主要內容
  return (
    <>
      {/* Toast 通知 */}
      {showToast && <Toast message={toastMessage} type={toastType} />}

      {/* 刪除確認視窗 */}
      {showDeleteModal && (
        <DeleteModal
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          transactionCount={0} // 交易删除不显示计数，仅类型删除显示
        />
      )}

      <div
        className="fixed inset-0 z-0 bg-[#F1F2F5]"
        onClick={() => incrementDebugClickCount()}
      />
      <div className="w-full max-w-md mx-auto pb-6 relative z-10">
        <div className="space-y-4 px-[20px] mt-[20px]">
          {/* 合併屬性和類型到同一個卡片 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            {/* 屬性 (交易類型) */}
            <Type type={transaction.type} onChange={handleTypeChange} />

            {/* 分隔線 */}
            <div className="border-t border-gray-100"></div>

            {/* 類型 */}
            <Category
              categories={categories}
              selectedCategory={transaction.category}
              isEditMode={isCategoryEditMode}
              onSelectCategory={handleSelectCategory}
              onToggleEditMode={handleToggleCategoryEditMode}
              onDeleteCategory={handleDeleteCategory}
              onAddCategory={handleAddCategory}
              onSaveNewCategory={handleSaveNewCategory}
              getCategoryTransactionCount={getCategoryTransactionCount}
            />
          </div>

          {/* 金額、日期 */}
          <div className="bg-white rounded-2xl shadow-sm space-y-4 p-4">
            {/* 金額 */}
            <Amount
              amount={transaction.amount}
              type={transaction.type}
              onChange={handleAmountChange}
            />

            <div className="border-t border-gray-100"></div>

            {/* 日期 */}
            <DatePicker date={transaction.date} onChange={handleDateChange} />
          </div>

          {/* 備註 */}
          <Note note={transaction.note} onChange={handleNoteChange} />

          {/* 按鈕區域 */}
          <ActionButtons
            hasChanges={hasChanges}
            onConfirm={handleConfirm}
            onDelete={handleDelete}
            disabled={isButtonsDisabled}
          />

          {/* 調試信息 - 點擊五次才會顯示 */}
          {debugClickCount >= 5 && (
            <Debug
              info={debugInfo}
              lineId={transaction.id}
              lineType={transaction.type}
            />
          )}

          {/* 更新時間顯示 */}
          {transaction.updated_at && (
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-400">
                最後更新 {formatTimestamp(transaction.updated_at)}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
