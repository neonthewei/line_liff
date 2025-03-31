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
import { Transaction } from "../shared/types";
import {
  useTransaction,
  useCategories,
  useToast,
  useDebugInfo,
} from "../shared/hooks";
import { BYPASS_LIFF } from "../shared/constants";
import { getUserIdFromLiff } from "../shared/utils";
import {
  updateTransactionApi,
  deleteTransactionApi,
  clearTransactionCache,
  parseDateToISOString,
  formatTimestamp,
} from "@/utils/api";
import { SUPABASE_URL, SUPABASE_KEY } from "@/utils/api";

import { Type } from "./type";
import { Category } from "./category";
import { Amount } from "./amount";
import { DatePicker } from "./date";
import { Note } from "./note";
import { ActionButtons, DeleteModal } from "./buttons";
import { Toast } from "./toast";
import { Skeleton } from "./skeleton";
import { Debug } from "./debug";

export default function TransactionDetail({
  onError,
}: {
  onError?: () => void;
}) {
  // 初始化相關狀態
  const [isLiffInitialized, setIsLiffInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isButtonsDisabled, setIsButtonsDisabled] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isCategoryEditMode, setIsCategoryEditMode] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);

  // 路由
  const router = useRouter();

  // 使用自定義 hooks
  const { debugClickCount, debugInfo, setDebugInfo, incrementDebugClickCount } =
    useDebugInfo();

  const { showToast, toastMessage, toastType, showToastNotification } =
    useToast();

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

  // 初始化 LIFF 和獲取數據
  useEffect(() => {
    if (!isMounted) return;

    setIsInitializing(true);

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

        // 初始化完成
        setIsInitializing(false);
      } catch (error) {
        console.error("Error initializing:", error);
        setIsInitializing(false);
        if (onError) onError();
      }
    }

    initialize();
  }, [isMounted, onError, setTransactionId, setDebugInfo]);

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
    showToastNotification("請選擇一個類型", "success", 2000);
  };

  // 導航回列表頁的輔助函數
  const navigateBackToList = () => {
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
  const handleDelete = async () => {
    if (!transaction) return;
    // 顯示自定義確認視窗
    setShowDeleteModal(true);
  };

  // 確認刪除
  const confirmDelete = async () => {
    if (!transaction) return;
    try {
      // 關閉確認視窗
      setShowDeleteModal(false);

      const success = await deleteTransactionApi(transaction.id);

      if (success) {
        // 顯示成功通知
        showToastNotification("刪除成功", "success", 800, navigateBackToList);
      } else {
        showToastNotification("刪除失敗，請稍後再試", "error");
      }
    } catch (error) {
      console.error("刪除交易失敗", error);
      showToastNotification("刪除失敗，請稍後再試", "error");
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
      showToastNotification("請選擇一個類型", "error", 2000);
      setIsEditingCategory(true);
      return;
    }

    try {
      // 檢查交易類型是否與原始類型不同
      const originalType = getLiffUrlParams().type || "expense";
      const hasTypeChanged = transaction.type !== originalType;

      if (hasTypeChanged) {
        // 如果類型已更改，需要刪除舊交易並創建新交易
        console.log("Transaction type changed, deleting old and creating new");

        // 先刪除原有的交易
        const deleteSuccess = await deleteTransactionApi(transaction.id);

        if (!deleteSuccess) {
          showToastNotification("儲存失敗，請稍後再試", "error");
          return;
        }

        // 獲取用戶ID
        const userId = await getUserIdFromLiff();
        if (!userId) {
          showToastNotification("無法獲取用戶ID，請重新登入", "error");
          return;
        }

        // 構建 API URL - 使用統一的 transactions 表
        const url = `${SUPABASE_URL}/transactions`;

        // 準備要創建的數據
        const createData = {
          user_id: userId,
          category: transaction.category,
          amount: Math.abs(transaction.amount),
          type: transaction.type, // 明確指定類型
          datetime: parseDateToISOString(transaction.date),
          memo: transaction.note,
          is_fixed: transaction.isFixed,
          frequency: transaction.fixedFrequency,
          interval: transaction.fixedInterval,
        };

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
          console.error("Create error response body:", errorText);
          showToastNotification("儲存失敗，請稍後再試", "error");
          return;
        }

        // 解析響應數據
        const data = await response.json();
        if (!data || data.length === 0) {
          showToastNotification("儲存失敗，請稍後再試", "error");
          return;
        }

        // 清除緩存
        if (userId) {
          const match = transaction.date.match(/(\d+)年(\d+)月(\d+)日/);
          if (match) {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]);
            clearTransactionCache(userId, year, month);
          }
        }

        // 顯示成功通知
        showToastNotification("儲存成功", "success", 800, navigateBackToList);
      } else {
        // 如果類型沒有變化，使用正常的更新流程
        const success = await updateTransactionApi(transaction);

        if (success) {
          // 檢查當前頁面路徑，判斷是否在編輯頁
          const isEditPage =
            typeof window !== "undefined" &&
            window.location.pathname.includes("/edit");

          // 如果是在編輯頁，更新後跳回帳目細項頁
          if (isEditPage) {
            // 導航回交易詳情頁
            router.push(`/transaction/${transaction.id}`);
            return;
          }

          // 顯示成功通知
          showToastNotification("儲存成功", "success", 800, navigateBackToList);
        } else {
          showToastNotification("儲存失敗，請稍後再試", "error");
        }
      }
    } catch (error) {
      console.error("儲存交易失敗", error);
      showToastNotification("儲存失敗，請稍後再試", "error");
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
  };

  const handleSaveNewCategory = async () => {
    if (newCategory.trim() === "") return;

    // 檢查類別是否已存在
    if (categories.includes(newCategory.trim())) {
      showToastNotification("此類別已存在", "error");
      return;
    }

    // 添加到資料庫
    if (transaction) {
      const success = await addCategoryToDatabase(
        newCategory.trim(),
        transaction.type
      );

      if (success) {
        // 更新本地類別列表 - 已在 hook 中處理
        // 如果不在編輯模式，自動選擇新類別
        if (!isCategoryEditMode) {
          handleSelectCategory(newCategory.trim());
        }

        showToastNotification("新增類別成功", "success");
      } else {
        showToastNotification("新增類別失敗，請稍後再試", "error");
      }
    }

    setIsAddingCategory(false);
  };

  // 新增類別到資料庫
  const addCategoryToDatabase = async (
    categoryName: string,
    type: "income" | "expense"
  ) => {
    try {
      // 獲取用戶ID
      const userId = await getUserIdFromLiff();
      if (!userId) {
        showToastNotification("無法獲取用戶ID，請重新登入", "error");
        return false;
      }

      // 構建 API URL
      const url = `${SUPABASE_URL}/categories`;

      // 準備要創建的數據
      const createData = {
        user_id: userId,
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

      // 重新獲取類別列表
      await fetchCategoriesFromDb();

      return true;
    } catch (error) {
      console.error("Error adding category to database:", error);
      return false;
    }
  };

  // 刪除類別
  const handleDeleteCategory = async (categoryToDelete: string) => {
    // 不允許刪除當前選中的類別
    if (transaction && categoryToDelete === transaction.category) {
      showToastNotification("無法刪除當前使用中的類別", "error");
      return;
    }

    try {
      // 獲取用戶ID
      const userId = await getUserIdFromLiff();
      if (!userId) {
        showToastNotification("無法獲取用戶ID，請重新登入", "error");
        return;
      }

      // 找到要刪除的類別
      const categoryToRemove = dbCategories.find(
        (cat) => cat.name === categoryToDelete
      );

      if (categoryToRemove) {
        if (categoryToRemove.user_id === null) {
          // 系統預設類別 - 創建一個用戶特定的"刪除標記"記錄
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

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              "Create delete marker error response body:",
              errorText
            );
            showToastNotification("刪除類別失敗，請稍後再試", "error");
            return;
          }
        } else {
          // 用戶自定義類別 - 直接標記為已刪除
          const url = `${SUPABASE_URL}/categories?id=eq.${categoryToRemove.id}`;

          // 發送 API 請求更新類別為已刪除
          const response = await fetch(url, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_KEY,
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              is_deleted: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Delete category error response body:", errorText);
            showToastNotification("刪除類別失敗，請稍後再試", "error");
            return;
          }
        }

        // 重新獲取類別列表
        await fetchCategoriesFromDb();

        // 顯示成功通知
        showToastNotification("類別已刪除", "success");
      } else {
        // 如果找不到類別 (也許是本地測試數據)，只需更新本地狀態
        if (transaction) {
          updateCategoryNamesByType(dbCategories, transaction.type);
        }
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      showToastNotification("刪除類別失敗，請稍後再試", "error");
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
            您已編輯或刪除帳目
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
        <DeleteModal onConfirm={confirmDelete} onCancel={cancelDelete} />
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
