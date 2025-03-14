"use client";

import { useState, useEffect } from "react";
import {
  ChevronRight,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Plus,
  Edit,
  X,
  ArrowLeft,
  Share2,
} from "lucide-react";
import { initializeLiff, closeLiff, getLiffUrlParams } from "@/utils/liff";
import liff from "@line/liff";
import { useRouter } from "next/navigation";
import { Transaction } from "@/types/transaction";
import { fetchTransactionById, updateTransactionApi, deleteTransactionApi } from "@/utils/api";
import { shareTransactionToFriends } from "@/utils/line-messaging";

// 預設類別選項
const defaultCategories = [
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
const defaultTransaction: Transaction = {
  id: "1",
  category: "餐飲",
  amount: -28.0,
  date: "2025年07月06日",
  type: "expense",
  note: "吃飯",
  isFixed: false,
  fixedFrequency: undefined,
  fixedInterval: 1,
};

export default function TransactionDetail() {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isCategoryEditMode, setIsCategoryEditMode] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date(2025, 6, 6));
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [newCategory, setNewCategory] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isLiffInitialized, setIsLiffInitialized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [lineId, setLineId] = useState<string>("");
  const [lineType, setLineType] = useState<string>("");
  const [debugInfo, setDebugInfo] = useState<{url: string, params: Record<string, string>}>({ url: "", params: {} });
  const [debugClickCount, setDebugClickCount] = useState(0);
  const [isFixedExpanded, setIsFixedExpanded] = useState(false);
  const [editFixedInterval, setEditFixedInterval] = useState("");
  const [isHidden, setIsHidden] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [isSharing, setIsSharing] = useState(false);
  const router = useRouter();

  // Mark component as mounted on client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize calendar date on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCalendarDate(new Date());
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    setIsLoading(true);

    async function initialize() {
      try {
        // 初始化 LIFF
        const liffInitialized = await initializeLiff();
        console.log("LIFF initialization result:", liffInitialized);
        
        // 獲取 URL 參數
        const params = getLiffUrlParams();
        setDebugInfo({ url: window.location.href, params });
        
        // 獲取交易 ID 和類型
        const id = params.id;
        const type = params.type || "expense";
        
        if (!id) {
          console.error("No transaction ID provided");
          setIsLoading(false);
          return;
        }
        
        // 獲取交易數據
        const data = await fetchTransactionById(id, type);
        
        if (data) {
          setTransaction(data);
          // 重置編輯狀態
          setEditAmount("");
          setEditNote("");
          setEditFixedInterval("");
        } else {
          // 如果找不到數據，保持 transaction 為 null
          console.warn("Transaction not found");
          setTransaction(null);
        }
      } catch (error) {
        console.error("Error initializing:", error);
        
        // 即使初始化失敗，也嘗試使用 URL 參數
        try {
          const params = new URLSearchParams(window.location.search);
          const id = params.get("id") || "";
          const type = params.get("type") || "expense";
          
          if (!id) {
            console.error("No transaction ID provided in URL");
            setTransaction(null);
            return;
          }
          
          // 獲取交易數據
          const data = await fetchTransactionById(id, type);
          
          if (data) {
            setTransaction(data);
            // 重置編輯狀態
            setEditAmount("");
            setEditNote("");
            setEditFixedInterval("");
          } else {
            // 如果找不到數據，保持 transaction 為 null
            console.warn("Transaction not found");
            setTransaction(null);
          }
        } catch (innerError) {
          console.error("Failed to recover from initialization error:", innerError);
          // 數據獲取失敗，保持 transaction 為 null
          setTransaction(null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [isMounted]);

  const handleTypeChange = async (type: "expense" | "income") => {
    if (!transaction) return;
    const updatedTransaction = {
      ...transaction,
      type,
      amount:
        type === "expense"
          ? -Math.abs(transaction.amount)
          : Math.abs(transaction.amount),
    };
    setTransaction(updatedTransaction);
  };

  // 顯示 Toast 通知的輔助函數
  const showToastNotification = (message: string, type: "success" | "error", duration = 3000, callback?: () => void) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    setTimeout(() => {
      setShowToast(false);
      if (callback) {
        callback();
      }
    }, duration);
  };

  const handleDelete = async () => {
    if (!transaction) return;
    if (confirm("確定要刪除這筆交易嗎？")) {
      try {
        const success = await deleteTransactionApi(transaction.id, transaction.type);

        if (success) {
          // 刪除成功後直接關閉 LIFF 視窗
          closeLiff();
          // 如果不在 LIFF 環境中，則導航回首頁
          if (!liff.isInClient()) {
            router.push("/");
          }
        } else {
          showToastNotification("刪除失敗，請稍後再試", "error");
        }
      } catch (error) {
        console.error("刪除交易失敗", error);
        showToastNotification("刪除失敗，請稍後再試", "error");
      }
    }
  };

  const handleConfirm = async () => {
    if (!transaction) return;
    try {
      const success = await updateTransactionApi(transaction);

      if (success) {
        // 更新成功後直接關閉 LIFF 視窗
        closeLiff();
        // 如果不在 LIFF 環境中，不做任何操作
      } else {
        showToastNotification("儲存失敗，請稍後再試", "error");
      }
    } catch (error) {
      console.error("儲存交易失敗", error);
      showToastNotification("儲存失敗，請稍後再試", "error");
    }
  };

  // 開始編輯金額
  const handleStartEditAmount = () => {
    if (!transaction) return;
    setIsEditingAmount(true);
    setEditAmount(Math.abs(transaction.amount).toString());
  };

  // 儲存金額
  const handleSaveAmount = async () => {
    if (!transaction) return;
    const amount = Number.parseFloat(editAmount);
    if (!isNaN(amount)) {
      const updatedTransaction = {
        ...transaction,
        amount: transaction.type === "expense" ? -amount : amount,
      };
      setTransaction(updatedTransaction);
      setIsEditingAmount(false);
    } else {
      // 如果輸入無效，重置為原始值
      setIsEditingAmount(false);
    }
  };

  // 開始編輯日期
  const handleToggleEditDate = () => {
    if (!transaction) return;
    setIsEditingDate(!isEditingDate);
    // 關閉其他編輯狀態
    if (!isEditingDate) {
      setIsEditingCategory(false);
    }
  };

  // 儲存日期
  const handleSaveDate = async (date: Date) => {
    if (!transaction) return;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const formattedDate = `${year}年${month.toString().padStart(2, "0")}月${day
      .toString()
      .padStart(2, "0")}日`;

    const updatedTransaction = { ...transaction, date: formattedDate };
    setTransaction(updatedTransaction);
    setEditDate(formattedDate);
    setCalendarDate(date);
    setIsEditingDate(false);
  };

  // 開始編輯類別
  const handleToggleEditCategory = () => {
    if (!transaction) return;
    setIsEditingCategory(!isEditingCategory);
    // 關閉其他編輯狀態
    if (!isEditingCategory) {
      setIsEditingDate(false);
    }
    // 重置類別編輯模式
    if (!isEditingCategory) {
      setIsCategoryEditMode(false);
      setIsAddingCategory(false);
    }
  };

  // 切換類別編輯模式
  const handleToggleCategoryEditMode = () => {
    setIsCategoryEditMode(!isCategoryEditMode);
    if (!isCategoryEditMode) {
      setIsAddingCategory(false);
    }
  };

  // 選擇類別
  const handleSelectCategory = async (category: string) => {
    if (!transaction) return;
    const updatedTransaction = { ...transaction, category };
    setTransaction(updatedTransaction);
  };

  // 刪除類別
  const handleDeleteCategory = (categoryToDelete: string) => {
    // 不允許刪除當前選中的類別
    if (transaction && categoryToDelete === transaction.category) {
      alert("無法刪除當前使用中的類別");
      return;
    }

    const updatedCategories = categories.filter(
      (category) => category !== categoryToDelete
    );
    setCategories(updatedCategories);
  };

  // 處理新增類別
  const handleAddCategory = () => {
    setIsAddingCategory(true);
    setNewCategory("");
  };

  // 儲存新類別
  const handleSaveNewCategory = () => {
    if (newCategory.trim() !== "" && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()];
      setCategories(updatedCategories);

      // 如果不在編輯模式，自動選擇新類別
      if (!isCategoryEditMode) {
        handleSelectCategory(newCategory.trim());
      }
    }
    setIsAddingCategory(false);
  };

  // 取消新增類別
  const handleCancelAddCategory = () => {
    setIsAddingCategory(false);
  };

  // 處理新類別輸入變更
  const handleNewCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCategory(e.target.value);
  };

  // 開始編輯備註
  const handleStartEditNote = () => {
    if (!transaction) return;
    setIsEditingNote(true);
    setEditNote(transaction.note);
  };

  // 儲存備註
  const handleSaveNote = async () => {
    if (!transaction) return;
    const updatedTransaction = { ...transaction, note: editNote };
    setTransaction(updatedTransaction);
    setIsEditingNote(false);
  };

  // 處理金額輸入變更
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditAmount(e.target.value);
  };

  // 處理備註輸入變更
  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditNote(e.target.value);
  };

  // 處理按鍵事件
  const handleKeyDown = (e: React.KeyboardEvent, saveFunction: () => void) => {
    if (e.key === "Enter") {
      saveFunction();
    }
  };

  // 日曆相關函數
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCalendarDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCalendarDate(newDate);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value);
    const newDate = new Date(calendarDate);
    newDate.setFullYear(year);
    setCalendarDate(newDate);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = parseInt(e.target.value);
    const newDate = new Date(calendarDate);
    newDate.setMonth(month);
    setCalendarDate(newDate);
  };

  // 生成年份選項
  const generateYearOptions = () => {
    // Use a fixed year for server-side rendering
    const currentYear = isMounted ? new Date().getFullYear() : 2025;
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };

  // 生成月份選項
  const generateMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push(i);
    }
    return months;
  };

  // 生成月曆
  const renderCalendar = () => {
    // Don't render calendar on server-side
    if (!isMounted) {
      return Array(42).fill(null).map((_, i) => (
        <div key={`placeholder-${i}`} className="h-8"></div>
      ));
    }

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    const days = [];

    // 填充月初的空白
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // 填充日期
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isSelected =
        transaction?.date ===
        `${year}年${(month + 1).toString().padStart(2, "0")}月${i
          .toString()
          .padStart(2, "0")}日`;

      days.push(
        <button
          key={`day-${i}`}
          className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            isSelected ? "bg-green-500 text-white" : ""
          }`}
          onClick={() => handleSaveDate(date)}
        >
          {i}
        </button>
      );
    }

    return days;
  };

  // 獲取月份名稱
  const getMonthName = (month: number) => {
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
  };

  const handleToggleFixedExpanded = () => {
    setIsFixedExpanded(!isFixedExpanded);
  };

  const handleFixedFrequencyChange = (frequency: "day" | "week" | "month") => {
    if (!transaction) return;
    
    // 確保間隔已設定
    const fixedInterval = transaction.fixedInterval || 1;
    
    const updatedTransaction = {
      ...transaction,
      fixedFrequency: frequency,
      fixedInterval: fixedInterval,
    };
    setTransaction(updatedTransaction);
  };

  const handleStartEditFixedInterval = () => {
    if (!transaction || transaction.fixedInterval === undefined) {
      setEditFixedInterval("1"); // 預設間隔為 1
    } else {
      setEditFixedInterval(transaction.fixedInterval.toString());
    }
  };

  const handleFixedIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 只允許數字
    const value = e.target.value.replace(/[^0-9]/g, "");
    // 確保值至少為 1
    const numValue = parseInt(value, 10);
    if (value === "" || isNaN(numValue)) {
      setEditFixedInterval(value);
    } else {
      setEditFixedInterval(numValue.toString());
    }
  };

  const handleSaveFixedInterval = async () => {
    if (!transaction) return;
    
    const fixedInterval = parseInt(editFixedInterval, 10);
    if (isNaN(fixedInterval) || fixedInterval <= 0) {
      setEditFixedInterval("1");
      return;
    }
    
    // 確保頻率已設定
    const fixedFrequency = transaction.fixedFrequency || "month";
    
    const updatedTransaction = {
      ...transaction,
      fixedInterval: fixedInterval,
      fixedFrequency: fixedFrequency,
    };
    
    setTransaction(updatedTransaction);
    setEditFixedInterval("");
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">載入中...</div>
    );
  if (!transaction) return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col justify-center items-center h-screen">
      <div
        className="fixed inset-0 z-0"
        onClick={() => setDebugClickCount(prev => prev + 1)}
      />
      <div className="text-center">
        <div className="text-2xl font-medium text-gray-800 mb-4">找不到交易記錄</div>
        <p className="text-gray-600 mb-6">您可能已經刪除帳目了</p>
      </div>
      
      {/* 調試信息 - 點擊五次才會顯示 */}
      {debugClickCount >= 5 && (
        <div className="mt-8 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-yellow-700">調試信息</p>
            <div className="h-px flex-1 bg-yellow-200 mx-2"></div>
          </div>
          <div className="space-y-2 overflow-hidden">
            <div className="flex flex-col">
              <span className="text-sm text-yellow-700">完整 URL:</span>
              <span className="text-xs text-yellow-600 break-all">{debugInfo.url}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-yellow-700">解析參數:</span>
              <div className="text-xs text-yellow-600">
                {Object.entries(debugInfo.params).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span>{key}:</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Toast 通知 */}
      {showToast && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
          toastType === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}>
          <div className="flex items-center">
            {toastType === "success" ? (
              <Check className="mr-2" size={18} />
            ) : (
              <X className="mr-2" size={18} />
            )}
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
      
      <div className="fixed inset-0 z-0 bg-[#F1F2F5]"
        onClick={() => setDebugClickCount(prev => prev + 1)}
      />
      <div className="w-full max-w-md mx-auto pb-6 relative z-10">
 
        <div className="space-y-4 px-[20px] mt-[20px]">
          {/* 類別 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 pl-2">類型</span>
                <div
                  className="flex items-center cursor-pointer px-2 py-1 rounded-lg"
                  onClick={handleToggleEditCategory}
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleToggleEditCategory()
                  }
                  aria-label="展開類型選單"
                >
                  <span className="text-gray-800">{transaction.category}</span>
                  {isEditingCategory ? (
                    <ChevronUp className="ml-2 text-gray-400" />
                  ) : (
                    <ChevronDown className="ml-2 text-gray-400" />
                  )}
                </div>
              </div>

              {/* 類別選擇器 */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isEditingCategory
                    ? "max-h-96 opacity-100 mt-4"
                    : "max-h-0 opacity-0"
                }`}
              >
                {!isAddingCategory ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {categories.map((category, index) => (
                        <div
                          key={index}
                          className={`relative py-2 rounded-xl text-center ${
                            category === transaction.category
                              ? "bg-[#22c55e] text-white"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {isCategoryEditMode ? (
                            // 編輯模式下點擊刪除類別
                            <button
                              className="w-full h-full flex items-center justify-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(category);
                              }}
                              aria-label={`刪除${category}類型`}
                            >
                              <span>{category}</span>
                              <X
                                size={18}
                                className="absolute right-2 animate-fadeIn hover:text-red-500 transition-colors duration-200"
                              />
                            </button>
                          ) : (
                            // 非編輯模式下點擊選擇類別
                            <button
                              className="w-full h-full"
                              onClick={() => handleSelectCategory(category)}
                            >
                              {category}
                            </button>
                          )}
                        </div>
                      ))}

                      {/* 新增類別按鈕，僅在編輯模式顯示 */}
                      {isCategoryEditMode && (
                        <button
                          className="py-2 rounded-xl text-center bg-blue-100 text-blue-600 flex items-center justify-center transition-all duration-300 ease-in-out animate-scaleIn"
                          onClick={handleAddCategory}
                        >
                          <Plus size={16} className="mr-1 animate-pulse-once" />
                          <span>新增</span>
                        </button>
                      )}
                    </div>

                    {/* 編輯按鈕 - 移至底部並佔滿整行 */}
                    <button
                      className={`w-full py-2 rounded-xl flex items-center justify-center transition-all duration-300 ease-in-out transform ${
                        isCategoryEditMode
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                      onClick={handleToggleCategoryEditMode}
                    >
                      <div className="flex items-center justify-center transition-all duration-300 ease-in-out">
                        {isCategoryEditMode ? (
                          <>
                            <Check size={16} className="mr-1 animate-fadeIn" />
                            <span className="animate-fadeIn">完成</span>
                          </>
                        ) : (
                          <>
                            <Edit size={16} className="mr-1 animate-fadeIn" />
                            <span className="animate-fadeIn">編輯</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-2">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={handleNewCategoryChange}
                        placeholder="輸入新類型"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none"
                        autoFocus
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSaveNewCategory()
                        }
                      />
                      <div className="flex space-x-2">
                        <button
                          className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg"
                          onClick={handleSaveNewCategory}
                        >
                          確定
                        </button>
                        <button
                          className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg"
                          onClick={handleCancelAddCategory}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 金額、日期、屬性組合在一起 */}
          <div className="bg-white rounded-2xl shadow-sm space-y-4 p-4">
            {/* 金額 */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 pl-2">金額</span>
              <div className="flex items-center">
                {isEditingAmount ? (
                  <div className="flex items-center">
                    {transaction.type === "expense" && (
                      <span className="text-gray-800">-</span>
                    )}
                    <span className="text-gray-800 mr-[0.5rem]">$</span>
                    <div className="relative inline-block">
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        value={editAmount}
                        onChange={handleAmountChange}
                        onBlur={handleSaveAmount}
                        onKeyDown={(e) => handleKeyDown(e, handleSaveAmount)}
                        className="w-32 px-2 py-1 rounded-lg text-right focus:outline-none"
                        autoFocus
                      />
                      <div className="absolute inset-0 pointer-events-none border border-gray-300 rounded-lg"></div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex items-center cursor-pointer px-2 py-1 rounded-lg"
                    onClick={handleStartEditAmount}
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleStartEditAmount()
                    }
                    aria-label="編輯金額"
                  >
                    {transaction.type === "expense" && (
                      <span className="text-gray-800">-</span>
                    )}
                    <span className="text-gray-800 mr-[0.5rem]">$</span>
                    <span className="text-gray-800">
                      {Math.abs(transaction.amount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 分隔線 */}
            <div className="border-t border-gray-100"></div>

            {/* 日期 */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 pl-2">日期</span>
                <div
                  className="flex items-center cursor-pointer px-2 py-1 rounded-lg"
                  onClick={handleToggleEditDate}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleToggleEditDate()}
                  aria-label="編輯日期"
                >
                  <span className="text-gray-800">{transaction.date}</span>
                  {isEditingDate ? (
                    <ChevronUp className="ml-2 text-gray-400" />
                  ) : (
                    <ChevronDown className="ml-2 text-gray-400" />
                  )}
                </div>
              </div>

              {/* 日曆選擇器 */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isEditingDate
                    ? "max-h-96 opacity-100 mt-4"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="rounded-lg">
                    {/* 年月選擇器 */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={handlePrevMonth}
                        className="p-1 rounded-full"
                        aria-label="上個月"
                      >
                        <ChevronLeft size={20} />
                      </button>

                      <div className="flex space-x-2">
                        <select
                          value={isMounted ? calendarDate.getFullYear() : 2025}
                          onChange={handleYearChange}
                          className="px-2 py-1 pr-4 border border-gray-200 rounded-lg bg-white focus:outline-none"
                        >
                          {generateYearOptions().map((year) => (
                            <option key={year} value={year}>
                              {year}年
                            </option>
                          ))}
                        </select>

                        <select
                          value={isMounted ? calendarDate.getMonth() : 0}
                          onChange={handleMonthChange}
                          className="px-2 py-1 pr-4 border border-gray-200 rounded-lg bg-white focus:outline-none"
                        >
                          {generateMonthOptions().map((month) => (
                            <option key={month} value={month}>
                              {getMonthName(month)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleNextMonth}
                        className="p-1 rounded-full"
                        aria-label="下個月"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>

                    {/* 星期標題 */}
                    <div className="grid grid-cols-7 mb-2">
                      {["日", "一", "二", "三", "四", "五", "六"].map(
                        (day, index) => (
                          <div
                            key={index}
                            className="text-center text-gray-500 text-sm"
                          >
                            {day}
                          </div>
                        )
                      )}
                    </div>

                    {/* 日曆主體 */}
                    <div className="grid grid-cols-7 gap-1">
                      {renderCalendar()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 分隔線 */}
            <div className="border-t border-gray-100"></div>

            {/* 交易類型 */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 pl-2">屬性</span>
              <div className="flex gap-2">
                <button
                  className={`px-6 py-1 rounded-xl min-w-[5rem] ${
                    transaction.type === "expense"
                      ? "bg-[#22c55e] text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                  onClick={() => handleTypeChange("expense")}
                >
                  支出
                </button>
                <button
                  className={`px-6 py-1 rounded-xl min-w-[5rem] ${
                    transaction.type === "income"
                      ? "bg-[#22c55e] text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                  onClick={() => handleTypeChange("income")}
                >
                  收入
                </button>
              </div>
            </div>

            {/* 分隔線 */}
            <div className="border-t border-gray-100"></div>

            {/* 固定支出/收入 */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 pl-2">定期{transaction.type === "expense" ? "支出" : "收入"}</span>
              <div className="flex items-center">
                <div
                  className="flex items-center cursor-pointer px-2 py-1 rounded-lg"
                  onClick={handleToggleFixedExpanded}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleToggleFixedExpanded()}
                  aria-label={isFixedExpanded ? "收起定期設定" : "展開定期設定"}
                >
                  <span className="text-gray-800">
                    {transaction.isFixed 
                      ? `每 ${transaction.fixedInterval || 1} ${transaction.fixedFrequency === "day" ? "日" : transaction.fixedFrequency === "week" ? "週" : "月"}`
                      : "未設定"}
                  </span>
                  {isFixedExpanded ? (
                    <ChevronUp className="ml-2 text-gray-400" />
                  ) : (
                    <ChevronDown className="ml-2 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
            
            {/* 定期支出/收入設定區域 */}
            <div 
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isFixedExpanded 
                  ? "max-h-96 opacity-100 mt-4"
                  : "max-h-0 opacity-0 !mt-0"
              }`}
            >
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="space-y-4">
                  {/* 開關按鈕 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">啟用</span>
                    <button
                      role="switch"
                      aria-checked={transaction.isFixed}
                      className={`relative inline-flex h-7 w-[5rem] items-center rounded-xl transition-colors duration-200 ease-in-out focus:outline-none ${
                        transaction.isFixed ? "bg-[#22c55e]" : "bg-gray-200"
                      }`}
                      onClick={() => {
                        const updatedTransaction = {
                          ...transaction,
                          isFixed: !transaction.isFixed,
                          // 如果關閉固定支出/收入，重置相關設定
                          // 如果開啟固定支出/收入，設定預設值
                          ...(transaction.isFixed 
                            ? { fixedFrequency: undefined, fixedInterval: undefined } 
                            : { 
                                fixedFrequency: "month" as "day" | "week" | "month", 
                                fixedInterval: 1 
                              })
                        };
                        setTransaction(updatedTransaction);
                      }}
                    >
                      <span
                        className={`inline-block h-5 w-9 transform rounded-lg bg-white transition-transform duration-200 ease-in-out ${
                          transaction.isFixed ? "translate-x-[2.5rem]" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  
                  {/* 合併頻率和間隔設定 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">頻率</span>
                    <div className="flex items-center gap-2">
                      {/* 間隔輸入 - 始終顯示輸入框，但根據開關狀態決定是否禁用 */}
                      <div className="flex items-center">
                        <span className={`mr-2 ${transaction.isFixed ? "text-gray-600" : "text-gray-400"}`}>每</span>
                        <div className="inline-flex items-center bg-white rounded-lg overflow-hidden border border-gray-300">
                          <button
                            className={`flex items-center justify-center w-7 h-8 ${
                              transaction.isFixed 
                                ? "text-gray-600 hover:bg-gray-100 active:bg-gray-200" 
                                : "text-gray-400 cursor-not-allowed opacity-50 bg-gray-50"
                            }`}
                            onClick={() => {
                              if (!transaction.isFixed) return;
                              const currentValue = transaction.fixedInterval || 1;
                              if (currentValue > 1) {
                                const updatedTransaction = {
                                  ...transaction,
                                  fixedInterval: currentValue - 1,
                                };
                                setTransaction(updatedTransaction);
                              }
                            }}
                            disabled={!transaction.isFixed}
                            aria-label="減少間隔"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={transaction.fixedInterval !== undefined ? transaction.fixedInterval.toString() : "1"}
                            onChange={(e) => {
                              if (!transaction.isFixed) return; // 如果關閉則不處理
                              
                              // 只允許數字
                              const value = e.target.value.replace(/[^0-9]/g, "");
                              // 確保值至少為 1
                              const numValue = parseInt(value, 10);
                              if (value === "" || isNaN(numValue)) {
                                return;
                              }
                              
                              const updatedTransaction = {
                                ...transaction,
                                fixedInterval: numValue,
                                // 確保頻率已設定
                                fixedFrequency: transaction.fixedFrequency || "month"
                              };
                              
                              setTransaction(updatedTransaction);
                            }}
                            onBlur={(e) => {
                              if (!transaction.isFixed) return; // 如果關閉則不處理
                              
                              // 確保值至少為 1
                              if (e.target.value === "" || parseInt(e.target.value, 10) <= 0) {
                                const updatedTransaction = {
                                  ...transaction,
                                  fixedInterval: 1
                                };
                                setTransaction(updatedTransaction);
                              }
                            }}
                            className={`w-8 px-0 py-1 text-center focus:outline-none border-0 ${
                              transaction.isFixed 
                                ? "text-gray-800" 
                                : "bg-gray-50 text-gray-400"
                            }`}
                            disabled={!transaction.isFixed}
                          />
                          <button
                            className={`flex items-center justify-center w-7 h-8 ${
                              transaction.isFixed 
                                ? "text-gray-600 hover:bg-gray-100 active:bg-gray-200" 
                                : "text-gray-400 cursor-not-allowed opacity-50 bg-gray-50"
                            }`}
                            onClick={() => {
                              if (!transaction.isFixed) return;
                              const currentValue = transaction.fixedInterval || 1;
                              const updatedTransaction = {
                                ...transaction,
                                fixedInterval: currentValue + 1,
                              };
                              setTransaction(updatedTransaction);
                            }}
                            disabled={!transaction.isFixed}
                            aria-label="增加間隔"
                          >
                            <ChevronUp size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {/* 頻率選擇 - 根據開關狀態決定是否禁用 */}
                      <div className="flex gap-1">
                        <button
                          className={`px-3 py-1 rounded-xl text-sm ${
                            transaction.isFixed
                              ? transaction.fixedFrequency === "day"
                                ? "bg-[#22c55e] text-white"
                                : "bg-gray-200 text-gray-600"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                          onClick={() => {
                            if (transaction.isFixed) handleFixedFrequencyChange("day");
                          }}
                          disabled={!transaction.isFixed}
                        >
                          日
                        </button>
                        <button
                          className={`px-3 py-1 rounded-xl text-sm ${
                            transaction.isFixed
                              ? transaction.fixedFrequency === "week"
                                ? "bg-[#22c55e] text-white"
                                : "bg-gray-200 text-gray-600"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                          onClick={() => {
                            if (transaction.isFixed) handleFixedFrequencyChange("week");
                          }}
                          disabled={!transaction.isFixed}
                        >
                          週
                        </button>
                        <button
                          className={`px-3 py-1 rounded-xl text-sm ${
                            transaction.isFixed
                              ? transaction.fixedFrequency === "month"
                                ? "bg-[#22c55e] text-white"
                                : "bg-gray-200 text-gray-600"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                          onClick={() => {
                            if (transaction.isFixed) handleFixedFrequencyChange("month");
                          }}
                          disabled={!transaction.isFixed}
                        >
                          月
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 備註 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col space-y-2">
              <span className="text-gray-600 pl-2">備註</span>
              <div className="w-full">
                <textarea
                  value={transaction.note}
                  onChange={(e) => {
                    const updatedTransaction = { ...transaction, note: e.target.value };
                    setTransaction(updatedTransaction);
                    
                    // 自动调整高度
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  onFocus={(e) => {
                    // 聚焦时确保高度适应内容
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  onBlur={() => {
                    // 移除自動儲存
                  }}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none border border-gray-300 text-gray-800 resize-none overflow-hidden"
                  style={{ 
                    height: "38px", // 初始高度设为一行
                    minHeight: "38px" // 最小高度为一行
                  }}
                  placeholder="輸入備註"
                  rows={1}
                />
              </div>
            </div>
          </div>

          {/* 按鈕區域 */}
          <div className="space-y-4 mt-8">
            {/* 確認按鈕 */}
            <button
              onClick={handleConfirm}
              className="w-full py-3 rounded-2xl bg-gray-200 text-gray-600 flex items-center justify-center"
            >
              <Check size={20} className="mr-2" />
              完成
            </button>

            {/* 刪除按鈕 */}
            <button
              onClick={handleDelete}
              className="w-full py-3 rounded-2xl bg-red-500 text-white flex items-center justify-center"
            >
              <Trash2 size={20} className="mr-2" />
              刪除
            </button>
            
            {/* LINE 參數顯示和調試信息 */}
            {debugClickCount >= 5 && (
              <>
                {/* LINE 參數顯示 */}
                {(lineId || lineType) && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">LINE 參數資訊</p>
                      <div className="h-px flex-1 bg-gray-200 mx-2"></div>
                    </div>
                    <div className="space-y-2">
                      {lineId && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">記錄 ID</span>
                          <span className="text-sm font-medium text-gray-700">{lineId}</span>
                        </div>
                      )}
                      {lineType && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">交易類型</span>
                          <span className="text-sm font-medium text-gray-700">{lineType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 調試信息 */}
                <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-yellow-700">調試信息</p>
                    <div className="h-px flex-1 bg-yellow-200 mx-2"></div>
                  </div>
                  <div className="space-y-2 overflow-hidden">
                    <div className="flex flex-col">
                      <span className="text-sm text-yellow-700">完整 URL:</span>
                      <span className="text-xs text-yellow-600 break-all">{debugInfo.url}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-yellow-700">解析參數:</span>
                      <div className="text-xs text-yellow-600">
                        {Object.entries(debugInfo.params).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key}:</span>
                            <span>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
