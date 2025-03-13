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
} from "lucide-react";
import { initializeLiff, closeLiff } from "@/utils/liff";
import { useRouter } from "next/navigation";

// 交易數據類型
interface Transaction {
  id: string;
  category: string;
  amount: number;
  date: string;
  type: "expense" | "income";
  note: string;
}

// 模擬交易數據
const defaultTransaction: Transaction = {
  id: "1",
  category: "餐飲",
  amount: -28.0,
  date: "2025年07月06日",
  type: "expense",
  note: "吃飯",
};

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

// 獲取交易詳情
async function getTransactionById(id: string): Promise<Transaction | null> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return defaultTransaction;
}

// 更新交易
async function updateTransaction(transaction: Transaction): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return true;
}

// 刪除交易
async function deleteTransaction(id: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return true;
}

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
      const liffInitialized = await initializeLiff();
      setIsLiffInitialized(liffInitialized);

      try {
        // Only access window in client-side code
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          // 獲取交易 ID 和 LINE 參數
          const transactionId = params.get("id") || "1";
          const lineIdParam = params.get("id") || "";
          const lineTypeParam = params.get("type") || "";
          
          // 設置 LINE 參數
          setLineId(lineIdParam);
          setLineType(lineTypeParam);

          const transactionData = await getTransactionById(transactionId);
          if (transactionData) {
            setTransaction(transactionData);
            setEditAmount(Math.abs(transactionData.amount).toString());
            setEditNote(transactionData.note);
            setEditDate(transactionData.date);

            // 解析日期字符串為 Date 對象
            const dateParts = transactionData.date.match(/(\d+)年(\d+)月(\d+)日/);
            if (dateParts) {
              const year = parseInt(dateParts[1]);
              const month = parseInt(dateParts[2]) - 1; // JavaScript 月份從 0 開始
              const day = parseInt(dateParts[3]);
              setCalendarDate(new Date(year, month, day));
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch transaction", error);
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

    try {
      await updateTransaction(updatedTransaction);
    } catch (error) {
      console.error("Failed to update transaction type", error);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    if (confirm("確定要刪除這筆交易嗎？")) {
      try {
        const success = await deleteTransaction(transaction.id);

        if (success) {
          // In development mode or when LIFF is not initialized, just navigate to home
          router.push("/");
        } else {
          alert("刪除失敗，請稍後再試");
        }
      } catch (error) {
        console.error("刪除交易失敗", error);
        alert("刪除失敗，請稍後再試");
      }
    }
  };

  const handleConfirm = async () => {
    if (!transaction) return;
    try {
      const success = await updateTransaction(transaction);

      if (success) {
        // In development mode or when LIFF is not initialized, just navigate to home
        router.push("/");
      } else {
        alert("儲存失敗，請稍後再試");
      }
    } catch (error) {
      console.error("儲存交易失敗", error);
      alert("儲存失敗，請稍後再試");
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

      try {
        await updateTransaction(updatedTransaction);
      } catch (error) {
        console.error("Failed to update amount", error);
      }
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

    try {
      await updateTransaction(updatedTransaction);
    } catch (error) {
      console.error("Failed to update date", error);
    }
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

    // 如果不在編輯模式，選擇後關閉下拉選單
    // 移除自動關閉下拉選單的邏輯，讓用戶自己點擊關閉
    // if (!isCategoryEditMode) {
    //   setIsEditingCategory(false)
    // }

    try {
      await updateTransaction(updatedTransaction);
    } catch (error) {
      console.error("Failed to update category", error);
    }
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

    try {
      await updateTransaction(updatedTransaction);
    } catch (error) {
      console.error("Failed to update note", error);
    }
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

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">載入中...</div>
    );
  if (!transaction) return <div>找不到交易記錄</div>;

  return (
    <div className="w-full max-w-md mx-auto pb-6 pt-4">
      <div className="space-y-4 px-4">
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
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
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
        </div>

        {/* 備註 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 pl-2">備註</span>
            <div className="flex items-center">
              {isEditingNote ? (
                <div className="relative inline-block">
                  <input
                    type="text"
                    value={editNote}
                    onChange={handleNoteChange}
                    onBlur={handleSaveNote}
                    onKeyDown={(e) => handleKeyDown(e, handleSaveNote)}
                    className="w-48 px-2 py-1 rounded-lg text-right focus:outline-none"
                    autoFocus
                  />
                  <div className="absolute inset-0 pointer-events-none border border-gray-300 rounded-lg"></div>
                </div>
              ) : (
                <div
                  className="flex items-center cursor-pointer px-2 py-1 rounded-lg"
                  onClick={handleStartEditNote}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleStartEditNote()}
                  aria-label="編輯備註"
                >
                  <span className="text-gray-800">{transaction.note}</span>
                </div>
              )}
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
          
          {/* LINE 參數顯示 */}
          {(lineId || lineType) && (
            <div className="mt-4 p-3 bg-gray-100 rounded-xl">
              <p className="text-xs text-gray-500 mb-2">LINE 參數資訊</p>
              <div className="text-sm text-gray-600">
                {lineId && <p className="mb-1">ID: {lineId}</p>}
                {lineType && <p>Type: {lineType}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
