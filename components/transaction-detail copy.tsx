"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
} from "lucide-react";
import { Transaction } from "@/types/transaction";
import { updateTransactionApi, deleteTransactionApi, clearTransactionCache, formatTimestamp, SUPABASE_URL, SUPABASE_KEY, parseDateToISOString } from "@/utils/api";

// 定義類別介面
interface Category {
  id: number;
  user_id: string | null;
  name: string;
  type: "income" | "expense";
  is_deleted: boolean;
  created_at: string;
}

// 預設類別選項 (僅在 API 請求失敗時使用)
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

// 在組件的 props 接口中添加 onError
interface TransactionDetailProps {
  onError?: () => void;
  transaction: Transaction; // 改為直接接收 transaction
  onUpdate?: (updatedTransaction: Transaction) => void; // 添加更新回調
  onDelete?: () => void; // 添加刪除回調
  onBack?: () => void; // 添加返回回調
}

// Define a consistent animation style for all content blocks
const fadeInAnimation = {
  opacity: 0,
  animation: 'fadeIn 0.3s ease-out forwards'
};

export default function TransactionDetail({ 
  onError, 
  transaction: initialTransaction, 
  onUpdate, 
  onDelete,
  onBack 
}: TransactionDetailProps) {
  // 確保初始交易數據包含所有必要字段
  const [transaction, setTransaction] = useState<Transaction>({
    ...initialTransaction,
    user_id: initialTransaction.user_id || "" // 確保 user_id 存在
  });
  const [originalTransaction, setOriginalTransaction] = useState<Transaction>({
    ...initialTransaction,
    user_id: initialTransaction.user_id || "" // 確保 user_id 存在
  });
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isCategoryEditMode, setIsCategoryEditMode] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 檢查資料是否有變動
  const hasChanges = useMemo(() => {
    return (
      transaction.type !== originalTransaction.type ||
      transaction.category !== originalTransaction.category ||
      transaction.amount !== originalTransaction.amount ||
      transaction.date !== originalTransaction.date ||
      transaction.note !== originalTransaction.note
    );
  }, [transaction, originalTransaction]);

  // Mark component as mounted on client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // 獲取類別
    fetchCategories();
  }, [isMounted]);

  // 從資料庫獲取類別
  const fetchCategories = async () => {
    try {
      // 構建 API URL
      const url = `${SUPABASE_URL}/categories`;
      
      // 發送 API 請求
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 先找出用戶已刪除的類別名稱（包括系統預設類別）
      const userDeletedCategoryNames = data
        .filter((cat: Category) => cat.user_id === transaction.user_id && cat.is_deleted)
        .map((cat: Category) => cat.name);
      
      // 過濾類別
      const filteredCategories = data.filter((cat: Category) => 
        (cat.user_id === transaction.user_id && !cat.is_deleted) ||
        (cat.user_id === null && !userDeletedCategoryNames.includes(cat.name))
      );
      
      setDbCategories(filteredCategories);
      
      // 更新類別名稱列表
      updateCategoryNamesByType(filteredCategories, transaction.type);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories(defaultCategories);
    }
  };
  
  // 根據交易類型更新類別名稱列表
  const updateCategoryNamesByType = (cats: Category[], type: "income" | "expense") => {
    const filteredNames = cats
      .filter(cat => cat.type === type)
      .map(cat => cat.name);
    
    // 如果沒有找到任何類別，使用預設類別
    if (filteredNames.length === 0) {
      setCategories(defaultCategories);
    } else {
      setCategories(filteredNames);
    }
  };

  // 當交易類型變更時，更新類別列表
  useEffect(() => {
    if (transaction && dbCategories.length > 0) {
      updateCategoryNamesByType(dbCategories, transaction.type);
    }
  }, [transaction?.type, dbCategories]);

  // 更新 setTransaction 的包裝函數，確保 user_id 始終存在
  const updateTransaction = (updates: Partial<Transaction>) => {
    setTransaction(current => ({
      ...current,
      ...updates,
      user_id: current.user_id // 保留現有的 user_id
    }));
  };

  // 修改 handleTypeChange 使用新的 updateTransaction 函數
  const handleTypeChange = async (type: "expense" | "income") => {
    if (!transaction) return;
    
    // 如果類型沒有變化，不做任何操作
    if (transaction.type === type) return;
    
    // 更新本地交易對象的類型和金額
    updateTransaction({
      type,
      amount: type === "expense" ? -Math.abs(transaction.amount) : Math.abs(transaction.amount),
      category: "" // 重置類別，因為不同類型有不同的類別選項
    });
    
    // 根據新類型更新類別列表
    if (dbCategories.length > 0) {
      updateCategoryNamesByType(dbCategories, type);
    }
    
    // 自動展開類型選擇區域
    setIsEditingCategory(true);
    
    // 顯示提示通知
    showToastNotification("請選擇一個類型", "success", 2000);
  };

  // 顯示 Toast 通知的輔助函數
  const showToastNotification = (message: string, type: "success" | "error", duration = 3000) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    setTimeout(() => {
      setShowToast(false);
    }, duration);
  };

  const handleDelete = async () => {
    if (!transaction) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setShowDeleteModal(false);
      const success = await deleteTransactionApi(transaction.id, transaction.type);

      if (success) {
        onDelete?.();
        showToastNotification("刪除成功", "success");
      } else {
        showToastNotification("刪除失敗，請稍後再試", "error");
      }
    } catch (error) {
      console.error("刪除交易失敗", error);
      showToastNotification("刪除失敗，請稍後再試", "error");
    }
  };

  const handleConfirm = async () => {
    if (!hasChanges) {
      onBack?.();
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
      const originalType = originalTransaction.type;
      const hasTypeChanged = transaction.type !== originalType;
      
      if (hasTypeChanged) {
        // 如果類型已更改，需要刪除舊交易並創建新交易
        console.log("交易類型已變更，刪除舊交易並創建新交易");
        
        // 先刪除原有的交易
        const deleteSuccess = await deleteTransactionApi(transaction.id, originalType);
        
        if (!deleteSuccess) {
          showToastNotification("儲存失敗，請稍後再試", "error");
          return;
        }
        
        // 構建 API URL
        const endpoint = transaction.type === "income" ? "incomes" : "expenses";
        const url = `${SUPABASE_URL}/${endpoint}`;
        
        // 準備要創建的數據
        const createData: any = {
          user_id: transaction.user_id,
          category: transaction.category,
          amount: Math.abs(transaction.amount),
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
            "apikey": SUPABASE_KEY,
            "Prefer": "return=representation",
          },
          body: JSON.stringify(createData),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("創建交易失敗:", errorText);
          showToastNotification("儲存失敗，請稍後再試", "error");
          return;
        }
        
        // 解析響應數據
        const data = await response.json();
        if (!data || data.length === 0) {
          showToastNotification("儲存失敗，請稍後再試", "error");
          return;
        }
        
        // 清除快取
        const match = transaction.date.match(/(\d+)年(\d+)月(\d+)日/);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]);
          clearTransactionCache(transaction.user_id, year, month);
        }
        
        // 使用新創建的交易 ID 更新 transaction 對象
        const newTransaction = {
          ...transaction,
          id: data[0].id,
        };
        
        // 通知父組件更新成功
        onUpdate?.(newTransaction);
        showToastNotification("儲存成功", "success");
        
        // 確保在返回之前，父組件有足夠時間處理更新和清除快取
        await new Promise(resolve => setTimeout(resolve, 300));
        onBack?.();
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

          // 通知父組件更新成功
          onUpdate?.(transaction);
          showToastNotification("儲存成功", "success");
          
          // 確保在返回之前，父組件有足夠時間處理更新和清除快取
          await new Promise(resolve => setTimeout(resolve, 300));
          onBack?.();
        } else {
          showToastNotification("儲存失敗，請稍後再試", "error");
        }
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

  // 修改其他更新函數使用 updateTransaction
  const handleSaveAmount = async () => {
    if (!transaction) return;
    const amount = Number.parseFloat(editAmount);
    if (!isNaN(amount)) {
      updateTransaction({
        amount: transaction.type === "expense" ? -amount : amount
      });
      setIsEditingAmount(false);
    } else {
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

  // 修改其他更新函數使用 updateTransaction
  const handleSaveDate = async (date: Date) => {
    if (!transaction) return;
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const formattedDate = `${year}年${month.toString().padStart(2, "0")}月${day
      .toString()
      .padStart(2, "0")}日`;

    updateTransaction({ date: formattedDate });
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

  // 修改其他更新函數使用 updateTransaction
  const handleSelectCategory = async (category: string) => {
    if (!transaction) return;
    updateTransaction({ category });
  };

  // 刪除類別
  const handleDeleteCategory = async (categoryToDelete: string) => {
    // 不允許刪除當前選中的類別
    if (transaction && categoryToDelete === transaction.category) {
      alert("無法刪除當前使用中的類別");
      return;
    }

    try {
      // 找到要刪除的類別
      const categoryToRemove = dbCategories.find(cat => cat.name === categoryToDelete);
      
      if (categoryToRemove) {
        if (categoryToRemove.user_id === null) {
          // 系統預設類別 - 創建一個用戶特定的"刪除標記"記錄
          const url = `${SUPABASE_URL}/categories`;
          
          // 準備要創建的數據 - 創建一個與系統預設同名但標記為已刪除的用戶特定記錄
          const createData = {
            user_id: transaction.user_id,
            name: categoryToRemove.name,
            type: categoryToRemove.type,
            is_deleted: true
          };
          
          // 發送 API 請求創建"刪除標記"記錄
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": SUPABASE_KEY,
              "Prefer": "return=representation",
            },
            body: JSON.stringify(createData),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("Create delete marker error response body:", errorText);
            alert("刪除類別失敗，請稍後再試");
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
              "apikey": SUPABASE_KEY,
              "Prefer": "return=representation",
            },
            body: JSON.stringify({ 
              is_deleted: true
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("Delete category error response body:", errorText);
            alert("刪除類別失敗，請稍後再試");
            return;
          }
        }
        
        // 更新本地類別列表 - 從顯示中移除已刪除的類別
        setDbCategories(prev => prev.filter(cat => cat.name !== categoryToDelete));
        setCategories(prev => prev.filter(cat => cat !== categoryToDelete));
        
        // 顯示成功通知
        showToastNotification("類別已刪除", "success");
      } else {
        // 如果找不到類別，只更新本地列表
        setCategories(prev => prev.filter(cat => cat !== categoryToDelete));
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("刪除類別失敗，請稍後再試");
    }
  };

  // 處理新增類別
  const handleAddCategory = () => {
    setIsAddingCategory(true);
    setNewCategory("");
  };

  // 儲存新類別
  const handleSaveNewCategory = async () => {
    if (newCategory.trim() === "") return;
    
    // 檢查類別是否已存在
    if (categories.includes(newCategory.trim())) {
      alert("此類別已存在");
      return;
    }
    
    // 添加到資料庫
    if (transaction) {
      const success = await addCategoryToDatabase(newCategory.trim(), transaction.type);
      
      if (success) {
        // 更新本地類別列表
        setCategories(prev => [...prev, newCategory.trim()]);
        
        // 如果不在編輯模式，自動選擇新類別
        if (!isCategoryEditMode) {
          handleSelectCategory(newCategory.trim());
        }
      } else {
        alert("新增類別失敗，請稍後再試");
      }
    }
    
    setIsAddingCategory(false);
  };

  // 修改 addCategoryToDatabase 函數
  const addCategoryToDatabase = async (categoryName: string, type: "income" | "expense") => {
    try {
      // 構建 API URL
      const url = `${SUPABASE_URL}/categories`;
      
      // 準備要創建的數據
      const createData = {
        user_id: transaction.user_id,
        name: categoryName,
        type: type,
        is_deleted: false
      };
      
      // 發送 API 請求創建新類別
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Prefer": "return=representation",
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
      setDbCategories(prev => [...prev, newCategory]);
      
      return true;
    } catch (error) {
      console.error("Error adding category to database:", error);
      return false;
    }
  };

  // 開始編輯備註
  const handleStartEditNote = () => {
    if (!transaction) return;
    setIsEditingNote(true);
    setEditNote(transaction.note);
  };

  // 修改其他更新函數使用 updateTransaction
  const handleSaveNote = async () => {
    if (!transaction) return;
    updateTransaction({ note: editNote });
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

  return (
    <>
      {/* Toast 通知 */}
      {showToast && (
        <div 
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 animate-fadeInDown ${
            toastType === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}
          style={{
            animation: 'fadeInDown 0.3s ease-out, fadeOutUp 0.3s ease-in forwards 2.5s'
          }}
        >
          <div className="flex items-center">
            {toastType === "success" ? (
              <Check className="mr-2 animate-pulse" size={18} />
            ) : (
              <X className="mr-2 animate-pulse" size={18} />
            )}
            <span className="animate-fadeIn">{toastMessage}</span>
          </div>
        </div>
      )}
      
      {/* 刪除確認視窗 */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl transform animate-scaleInStatic"
            onClick={(e) => e.stopPropagation()} // 防止點擊內容區域時關閉視窗
          >
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">確定要刪除嗎？</h3>
              <p className="text-sm text-gray-500">此操作無法復原，刪除後資料將永久消失。</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 rounded-xl bg-gray-200 text-gray-700 font-medium transition-all duration-150 active:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white font-medium transition-all duration-150 active:bg-red-600"
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="fixed inset-0 z-0 bg-[#F1F2F5]" />
      <div className="w-full max-w-md mx-auto pb-6 relative z-10">
        <div className="space-y-4 px-[20px] mt-[20px]">
          {/* 合併屬性和類型到同一個卡片 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            {/* 屬性 (交易類型) */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 pl-2">屬性</span>
              <div className="flex gap-2">
                <button
                  className={`px-6 py-1 rounded-xl min-w-[5rem] transition-all duration-150 ${
                    transaction.type === "expense"
                      ? "bg-[#22c55e] text-white active:bg-green-600 active:scale-[0.98]"
                      : "bg-gray-200 text-gray-600 active:bg-gray-300 active:scale-[0.98]"
                  }`}
                  onClick={() => handleTypeChange("expense")}
                >
                  支出
                </button>
                <button
                  className={`px-6 py-1 rounded-xl min-w-[5rem] transition-all duration-150 ${
                    transaction.type === "income"
                      ? "bg-[#22c55e] text-white active:bg-green-600 active:scale-[0.98]"
                      : "bg-gray-200 text-gray-600 active:bg-gray-300 active:scale-[0.98]"
                  }`}
                  onClick={() => handleTypeChange("income")}
                >
                  收入
                </button>
              </div>
            </div>

            {/* 分隔線 */}
            <div className="border-t border-gray-100"></div>

            {/* 類型 */}
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
                              className="w-full h-full flex items-center justify-center active:bg-gray-300 active:scale-[0.98] transition-all duration-150"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(category);
                              }}
                              aria-label={`刪除${category}類型`}
                            >
                              <span>{category}</span>
                              {/* 不在當前選中的類別上顯示刪除圖標 */}
                              {category !== transaction.category && (
                                <X
                                  size={18}
                                  className="absolute right-2 hover:text-red-500 transition-colors duration-200"
                                />
                              )}
                            </button>
                          ) : (
                            // 非編輯模式下點擊選擇類別
                            <button
                              className="w-full h-full active:bg-opacity-80 active:scale-[0.98] transition-all duration-150"
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
                          className="py-2 rounded-xl text-center bg-green-100 text-green-600 flex items-center justify-center transition-all duration-300 ease-in-out active:bg-green-200"
                          onClick={handleAddCategory}
                        >
                          <Plus size={16} className="mr-1" />
                          <span>新增</span>
                        </button>
                      )}
                    </div>

                    {/* 編輯按鈕 - 移至底部並佔滿整行 */}
                    <button
                      className={`w-full py-2 rounded-xl flex items-center justify-center transition-all duration-300 ease-in-out ${
                        isCategoryEditMode
                          ? "bg-green-100 text-green-600 active:bg-green-200"
                          : "bg-gray-100 text-gray-600 active:bg-gray-200"
                      }`}
                      onClick={handleToggleCategoryEditMode}
                    >
                      <div className="flex items-center justify-center">
                        {isCategoryEditMode ? (
                          <>
                            <Check size={16} className="mr-1" />
                            <span>完成</span>
                          </>
                        ) : (
                          <>
                            <Edit size={16} className="mr-1" />
                            <span>編輯</span>
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
                        onChange={(e) => {
                          setNewCategory(e.target.value);
                        }}
                        placeholder="輸入新類型"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none"
                        autoFocus
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSaveNewCategory()
                        }
                      />
                      <div className="flex space-x-2">
                        <button
                          className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg transition-all duration-150 active:bg-green-600 active:scale-[0.98]"
                          onClick={handleSaveNewCategory}
                        >
                          確定
                        </button>
                        <button
                          className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg transition-all duration-150 active:bg-gray-300 active:scale-[0.98]"
                          onClick={() => setIsAddingCategory(false)}
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
          <div className="space-y-4">
            {/* 確認按鈕 */}
            <button
              onClick={handleConfirm}
              className={`w-full py-3 rounded-2xl flex items-center justify-center ${
                hasChanges
                  ? "bg-[#22c55e] text-white active:bg-green-600"
                  : "bg-gray-200 text-gray-600 active:bg-gray-300"
              } transition-[background-color] duration-150`}
            >
              {hasChanges ? (
                <>
                  <Check size={20} className="mr-2" />
                  更新
                </>
              ) : (
                <>
                  <ArrowLeft size={20} className="mr-2" />
                  返回
                </>
              )}
            </button>

            {/* 刪除按鈕 */}
            <button
              onClick={handleDelete}
              className="w-full py-3 rounded-2xl bg-red-500 text-white flex items-center justify-center transition-colors duration-150 active:bg-red-600"
            >
              <Trash2 size={20} className="mr-2" />
              刪除
            </button>
          </div>

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
