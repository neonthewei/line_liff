"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { RecurringDetailProps } from "./types";
import { useTransactionEditor } from "./hooks";
import { formatDateForDisplay, showToastNotification } from "./utils";
import { isTemporaryTransaction } from "../list/utils";
import { SUPABASE_URL, SUPABASE_KEY } from "@/utils/api";
import { getTaipeiISOString, getTaipeiDate } from "@/utils/date";

export default function RecurringDetail({
  transaction,
  onClose,
  onSave,
  onDelete,
}: RecurringDetailProps) {
  const {
    editedTransaction,
    setEditedTransaction,
    isEditingName,
    setIsEditingName,
    isEditingAmount,
    setIsEditingAmount,
    isEditingInterval,
    setIsEditingInterval,
    isEditingDates,
    setIsEditingDates,
    showDeleteModal,
    setShowDeleteModal,
    editName,
    setEditName,
    editAmount,
    setEditAmount,
    selectedDate,
    setSelectedDate,
    calendarDate,
    setCalendarDate,
    categories,
    setCategories,
    dbCategories,
    setDbCategories,
    isEditingCategory,
    setIsEditingCategory,
    isCategoryEditMode,
    setIsCategoryEditMode,
    isAddingCategory,
    setIsAddingCategory,
    newCategory,
    setNewCategory,
    hasChanges,
    updateCategoryNamesByType,
  } = useTransactionEditor(transaction, onSave);

  if (!editedTransaction) return null;

  // Handle type change
  const handleTypeChange = (type: "expense" | "income") => {
    if (!editedTransaction) return;

    // 如果類型沒有變化，不做任何操作
    if (editedTransaction.type === type) return;

    // 更新本地交易對象的類型，不再更改金額正負值
    const updatedTransaction = {
      ...editedTransaction,
      type,
      // 重置類別，因為不同類型有不同的類別選項
      category: "",
    };

    // 更新本地狀態
    setEditedTransaction(updatedTransaction);

    // 根據新類型更新類別列表
    if (dbCategories.length > 0) {
      updateCategoryNamesByType(dbCategories, type);
    }

    // 自動展開類型選擇區域
    setIsEditingCategory(true);
  };

  // Handle name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditName(e.target.value);
  };

  // Start editing name
  const handleStartEditName = () => {
    setIsEditingName(true);
    setEditName(editedTransaction.memo);
  };

  // Save name
  const handleSaveName = () => {
    if (editName.trim()) {
      setEditedTransaction({
        ...editedTransaction,
        memo: editName.trim(),
      });
    }
    setIsEditingName(false);
  };

  // Handle amount change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and decimal point
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setEditAmount(value);
  };

  // Start editing amount
  const handleStartEditAmount = () => {
    setIsEditingAmount(true);
    setEditAmount(editedTransaction.amount.toString());
  };

  // Save amount
  const handleSaveAmount = () => {
    const value = parseFloat(editAmount);
    if (!isNaN(value)) {
      setEditedTransaction({
        ...editedTransaction,
        amount: value, // 直接使用输入的金额，不根据类型设置正负
      });
    }
    setIsEditingAmount(false);
  };

  // Handle key down events for input fields
  const handleKeyDown = (e: React.KeyboardEvent, saveFunction: () => void) => {
    if (e.key === "Enter") {
      saveFunction();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
      setIsEditingAmount(false);
    }
  };

  // Handle interval change
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setEditedTransaction({
        ...editedTransaction,
        frequency: value,
      });
    }
  };

  // Handle frequency type change
  const handleFrequencyTypeChange = (interval: string) => {
    // Standardize interval values to match database constraints
    let standardizedInterval = interval;

    // Map to standardized values that match the database constraint
    if (interval === "week") standardizedInterval = "weekly";
    if (interval === "month") standardizedInterval = "monthly";
    if (interval === "year") standardizedInterval = "yearly";

    setEditedTransaction({
      ...editedTransaction,
      interval: standardizedInterval,
    });
  };

  // Handle save
  const handleSave = () => {
    if (!editedTransaction) return;

    // Validate category
    if (!editedTransaction.category) {
      showToastNotification("請選擇類型", "error", 2000);
      return;
    }

    // Validate amount is not zero
    if (editedTransaction.amount === 0) {
      showToastNotification("金額不能為0", "error", 2000);
      return;
    }

    if (!hasChanges) {
      // If no changes, just close
      onClose();
      return;
    }

    // Close all editing states
    setIsEditingName(false);
    setIsEditingAmount(false);
    setIsEditingInterval(false);
    setIsEditingDates(false);

    onSave(editedTransaction);
  };

  // Handle delete or cancel
  const handleDelete = () => {
    if (isTemporaryTransaction(editedTransaction.id)) {
      // For new transactions, just close without showing warning
      onClose();
    } else {
      // For existing transactions, show delete confirmation
      setShowDeleteModal(true);
    }
  };

  // Confirm delete
  const confirmDelete = () => {
    if (editedTransaction) {
      onDelete(editedTransaction.id);
    }
    setShowDeleteModal(false);
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    // 使用不依赖时区的方式格式化日期
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const formattedDate = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    if (selectedDate === "start") {
      setEditedTransaction({
        ...editedTransaction,
        start_date: formattedDate,
      });
    } else {
      setEditedTransaction({
        ...editedTransaction,
        end_date: formattedDate,
      });
    }
  };

  // Handle removing end date
  const handleRemoveEndDate = () => {
    setEditedTransaction({
      ...editedTransaction,
      end_date: undefined,
    });
  };

  // Calendar navigation functions
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

  // Generate year options for select
  const generateYearOptions = () => {
    const currentYear = getTaipeiDate().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };

  // Generate month options for select
  const generateMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push(i);
    }
    return months;
  };

  // Get month name
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

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Render calendar
  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    const days = [];

    // Fill in empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // Fill in the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      // 创建本地日期，避免时区问题
      const date = new Date(year, month, i);
      // 使用不依赖时区的方式格式化日期
      const dateString = `${year}-${String(month + 1).padStart(
        2,
        "0"
      )}-${String(i).padStart(2, "0")}`;

      const isStartDate = editedTransaction.start_date === dateString;
      const isEndDate = editedTransaction.end_date === dateString;
      const isSelected =
        (selectedDate === "start" && isStartDate) ||
        (selectedDate === "end" && isEndDate);

      if (isEndDate) {
        // 对于结束日期，使用div包装而不是button
        days.push(
          <div
            key={`day-${i}`}
            className={`relative h-8 w-8 rounded-lg flex items-center justify-center ${
              isStartDate && isEndDate
                ? "bg-green-500 text-white"
                : isStartDate
                ? "bg-green-500 text-white"
                : isEndDate
                ? "bg-blue-500 text-white group"
                : isSelected
                ? "bg-gray-300"
                : ""
            }`}
          >
            <div
              className="w-full h-full flex items-center justify-center cursor-pointer"
              onClick={() => handleDateSelect(date)}
            >
              {i}
            </div>
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveEndDate();
              }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors duration-150 cursor-pointer"
              aria-label="移除結束日期"
            >
              <X size={10} className="text-gray-600" />
            </span>
          </div>
        );
      } else {
        // 对于普通日期，继续使用button
        days.push(
          <button
            key={`day-${i}`}
            className={`relative h-8 w-8 rounded-lg flex items-center justify-center ${
              isStartDate && isEndDate
                ? "bg-green-500 text-white"
                : isStartDate
                ? "bg-green-500 text-white"
                : isEndDate
                ? "bg-blue-500 text-white group"
                : isSelected
                ? "bg-gray-300"
                : ""
            }`}
            onClick={() => handleDateSelect(date)}
          >
            {i}
          </button>
        );
      }
    }

    return days;
  };

  // Add category management functions
  const handleToggleEditCategory = () => {
    if (!editedTransaction) return;
    setIsEditingCategory(!isEditingCategory);
    // Close other editing states
    if (!isEditingCategory) {
      setIsEditingDates(false);
    }
    // Reset category edit mode
    if (!isEditingCategory) {
      setIsCategoryEditMode(false);
      setIsAddingCategory(false);
    }
  };

  const handleToggleCategoryEditMode = () => {
    setIsCategoryEditMode(!isCategoryEditMode);
    if (!isCategoryEditMode) {
      setIsAddingCategory(false);
    }
  };

  const handleSelectCategory = async (category: string) => {
    if (!editedTransaction) return;
    try {
      // 更新本地狀態
      setEditedTransaction({
        ...editedTransaction,
        category,
      });

      // 如果是臨時交易（新建中），不需要更新資料庫
      if (isTemporaryTransaction(editedTransaction.id)) {
        return;
      }

      // 更新資料庫
      const response = await fetch(
        `${SUPABASE_URL}/recurring?id=eq.${editedTransaction.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            category,
            updated_at: getTaipeiISOString(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update category: ${response.status}`);
      }
    } catch (error) {
      console.error("Error updating category:", error);
      // 如果更新失敗，還原到原始狀態
      if (editedTransaction?.category) {
        setEditedTransaction({
          ...editedTransaction,
          category: editedTransaction.category,
        });
      }
      alert("更新類型失敗，請稍後再試");
    }
  };

  const handleDeleteCategory = async (categoryToDelete: string) => {
    // Don't allow deleting currently selected category
    if (editedTransaction && categoryToDelete === editedTransaction.category) {
      alert("無法刪除當前使用中的類別");
      return;
    }

    try {
      // Find the category to delete
      const categoryToRemove = dbCategories.find(
        (cat) => cat.name === categoryToDelete
      );

      if (categoryToRemove) {
        if (categoryToRemove.user_id === null) {
          // System default category - create a user-specific "delete marker" record
          const url = `${SUPABASE_URL}/categories`;

          // Prepare data - create a user-specific record with same name but marked as deleted
          const createData = {
            user_id: editedTransaction?.user_id,
            name: categoryToRemove.name,
            type: categoryToRemove.type,
            is_deleted: true,
          };

          // Send API request to create "delete marker" record
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
            alert("刪除類別失敗，請稍後再試");
            return;
          }
        } else {
          // User-defined category - mark as deleted directly
          const url = `${SUPABASE_URL}/categories?id=eq.${categoryToRemove.id}`;

          // Send API request to update category as deleted
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
            alert("刪除類別失敗，請稍後再試");
            return;
          }
        }

        // Update local category lists
        setDbCategories((prev) =>
          prev.filter((cat) => cat.name !== categoryToDelete)
        );
        setCategories((prev) => prev.filter((cat) => cat !== categoryToDelete));
      } else {
        // If category not found, just update local list
        setCategories((prev) => prev.filter((cat) => cat !== categoryToDelete));
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("刪除類別失敗，請稍後再試");
    }
  };

  const handleAddCategory = () => {
    setIsAddingCategory(true);
    setNewCategory("");
  };

  const handleSaveNewCategory = async () => {
    if (newCategory.trim() === "") return;

    // Check if category already exists
    if (categories.includes(newCategory.trim())) {
      alert("此類別已存在");
      return;
    }

    // Add to database
    if (editedTransaction) {
      const success = await addCategoryToDatabase(
        newCategory.trim(),
        editedTransaction.type
      );

      if (success) {
        // Update local category list
        setCategories((prev) => [...prev, newCategory.trim()]);

        // If not in edit mode, automatically select new category
        if (!isCategoryEditMode) {
          handleSelectCategory(newCategory.trim());
        }
      } else {
        alert("新增類別失敗，請稍後再試");
      }
    }

    setIsAddingCategory(false);
  };

  const addCategoryToDatabase = async (
    categoryName: string,
    type: "income" | "expense"
  ) => {
    try {
      // Construct API URL
      const url = `${SUPABASE_URL}/categories`;

      // Prepare data to create
      const createData = {
        user_id: editedTransaction?.user_id,
        name: categoryName,
        type: type,
        is_deleted: false,
      };

      // Send API request to create new category
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
        return false;
      }

      // Parse response data
      const data = await response.json();
      if (!data || data.length === 0) {
        return false;
      }

      // Update local category list
      const newCategory = data[0];
      setDbCategories((prev) => [...prev, newCategory]);

      return true;
    } catch (error) {
      console.error("Error adding category to database:", error);
      return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 overflow-y-auto">
      {/* Delete confirmation modal - only shown for existing transactions */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn"
          onClick={cancelDelete}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl transform animate-scaleInStatic"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                確定要刪除嗎？
              </h3>
              <p className="text-sm text-gray-500">
                此操作無法復原，刪除後資料將永久消失。
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelDelete}
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

      {/* Fixed background */}
      <div className="fixed inset-0 z-0 bg-[#F1F2F5]" />

      {/* Main content */}
      <div className="w-full max-w-md mx-auto pb-6 relative z-10">
        <div className="space-y-4 px-[20px] mt-[20px]">
          {/* Card 1: Transaction type and name */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            {/* Transaction type */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 pl-2">屬性</span>
              <div className="flex gap-2">
                <button
                  className={`px-6 py-1 rounded-xl min-w-[5rem] transition-all duration-150 ${
                    editedTransaction.type === "expense"
                      ? "bg-[#22c55e] text-white active:bg-green-600 active:scale-[0.98]"
                      : "bg-gray-200 text-gray-600 active:bg-gray-300 active:scale-[0.98]"
                  }`}
                  onClick={() => handleTypeChange("expense")}
                >
                  支出
                </button>
                <button
                  className={`px-6 py-1 rounded-xl min-w-[5rem] transition-all duration-150 ${
                    editedTransaction.type === "income"
                      ? "bg-[#22c55e] text-white active:bg-green-600 active:scale-[0.98]"
                      : "bg-gray-200 text-gray-600 active:bg-gray-300 active:scale-[0.98]"
                  }`}
                  onClick={() => handleTypeChange("income")}
                >
                  收入
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100"></div>

            {/* Category */}
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
                  <span className="text-gray-800">
                    {editedTransaction?.category || "請選擇類型"}
                  </span>
                  {isEditingCategory ? (
                    <ChevronUp className="ml-2 text-gray-400" />
                  ) : (
                    <ChevronDown className="ml-2 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Category selector */}
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
                            category === editedTransaction?.category
                              ? "bg-[#22c55e] text-white"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {isCategoryEditMode ? (
                            // Edit mode - click to delete category
                            <button
                              className="w-full h-full flex items-center justify-center active:bg-gray-300 active:scale-[0.98] transition-all duration-150"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(category);
                              }}
                              aria-label={`刪除${category}類型`}
                            >
                              <span>{category}</span>
                              {/* Only show delete icon on non-selected categories */}
                              {category !== editedTransaction?.category && (
                                <X
                                  size={18}
                                  className="absolute right-2 hover:text-red-500 transition-colors duration-200"
                                />
                              )}
                            </button>
                          ) : (
                            // Normal mode - click to select category
                            <button
                              className="w-full h-full active:bg-opacity-80 active:scale-[0.98] transition-all duration-150"
                              onClick={() => handleSelectCategory(category)}
                            >
                              {category}
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add category button - only show in edit mode */}
                      {isCategoryEditMode && (
                        <button
                          className={`py-2 rounded-xl text-center bg-green-100 text-green-600 flex items-center justify-center transition-all duration-300 ease-in-out active:bg-green-200`}
                          onClick={handleAddCategory}
                        >
                          <Plus size={16} className="mr-1" />
                          <span>新增</span>
                        </button>
                      )}
                    </div>

                    {/* Edit button - moved to bottom and full width */}
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

          {/* Card 2: Amount, recurrence, and date range */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            {/* Amount - clickable to edit */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 pl-2">金額</span>
              <div className="flex items-center">
                {isEditingAmount ? (
                  <div className="flex items-center">
                    <span className="text-gray-800 mr-2">
                      {editedTransaction.type === "expense" ? "-" : ""}$
                    </span>
                    <div className="relative inline-block">
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        value={editAmount}
                        onChange={handleAmountChange}
                        onBlur={handleSaveAmount}
                        onKeyDown={(e) => handleKeyDown(e, handleSaveAmount)}
                        className="w-24 px-2 py-1 text-right focus:outline-none"
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
                    <span className="text-gray-800">
                      {editedTransaction.type === "expense" ? "-" : ""}$
                      {Math.abs(editedTransaction.amount)}
                    </span>
                    <Edit className="h-5 w-5 mr-0.5 ml-2.5 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100"></div>

            {/* Recurrence */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 pl-2">週期</span>
                <div
                  className="flex items-center cursor-pointer px-2 py-1 rounded-lg"
                  onClick={() => setIsEditingInterval(!isEditingInterval)}
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    setIsEditingInterval(!isEditingInterval)
                  }
                  aria-label="編輯週期"
                >
                  <span className="text-gray-800">
                    每 {editedTransaction.frequency}{" "}
                    {editedTransaction.interval === "day" ||
                    editedTransaction.interval === "daily"
                      ? "天"
                      : editedTransaction.interval === "week" ||
                        editedTransaction.interval === "weekly"
                      ? "週"
                      : editedTransaction.interval === "month" ||
                        editedTransaction.interval === "monthly"
                      ? "月"
                      : "年"}
                  </span>
                  {isEditingInterval ? (
                    <ChevronUp className="ml-2 text-gray-400" />
                  ) : (
                    <ChevronDown className="ml-2 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Recurrence dropdown */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isEditingInterval
                    ? "max-h-96 opacity-100 mt-4"
                    : "max-h-0 opacity-0 mt-0 mb-0 p-0"
                }`}
              >
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="space-y-4">
                    {/* Interval input */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">間隔</span>
                      <div className="inline-flex items-center bg-white rounded-lg overflow-hidden border border-gray-300">
                        <button
                          className="flex items-center justify-center w-7 h-8 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                          onClick={() => {
                            if (editedTransaction.frequency > 1) {
                              setEditedTransaction({
                                ...editedTransaction,
                                frequency: editedTransaction.frequency - 1,
                              });
                            }
                          }}
                          aria-label="減少間隔"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={editedTransaction.frequency}
                          onChange={handleIntervalChange}
                          className="w-12 px-0 py-1 text-center focus:outline-none border-0 text-gray-800"
                        />
                        <button
                          className="flex items-center justify-center w-7 h-8 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                          onClick={() => {
                            setEditedTransaction({
                              ...editedTransaction,
                              frequency: editedTransaction.frequency + 1,
                            });
                          }}
                          aria-label="增加間隔"
                        >
                          <ChevronUp size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Frequency type selection */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">單位</span>
                      <div className="flex gap-1">
                        <button
                          className={`px-3 py-1 rounded-xl text-sm transition-all duration-150 ${
                            editedTransaction.interval === "day" ||
                            editedTransaction.interval === "daily"
                              ? "bg-[#22c55e] text-white active:bg-green-600 active:scale-[0.98]"
                              : "bg-gray-200 text-gray-600 active:bg-gray-300 active:scale-[0.98]"
                          }`}
                          onClick={() => handleFrequencyTypeChange("day")}
                        >
                          天
                        </button>
                        <button
                          className={`px-3 py-1 rounded-xl text-sm transition-all duration-150 ${
                            editedTransaction.interval === "week" ||
                            editedTransaction.interval === "weekly"
                              ? "bg-[#22c55e] text-white active:bg-green-600 active:scale-[0.98]"
                              : "bg-gray-200 text-gray-600 active:bg-gray-300 active:scale-[0.98]"
                          }`}
                          onClick={() => handleFrequencyTypeChange("week")}
                        >
                          週
                        </button>
                        <button
                          className={`px-3 py-1 rounded-xl text-sm transition-all duration-150 ${
                            editedTransaction.interval === "month" ||
                            editedTransaction.interval === "monthly"
                              ? "bg-[#22c55e] text-white active:bg-green-600 active:scale-[0.98]"
                              : "bg-gray-200 text-gray-600 active:bg-gray-300 active:scale-[0.98]"
                          }`}
                          onClick={() => handleFrequencyTypeChange("month")}
                        >
                          月
                        </button>
                        <button
                          className={`px-3 py-1 rounded-xl text-sm transition-all duration-150 ${
                            editedTransaction.interval === "year" ||
                            editedTransaction.interval === "yearly"
                              ? "bg-[#22c55e] text-white active:bg-green-600 active:scale-[0.98]"
                              : "bg-gray-200 text-gray-600 active:bg-gray-300 active:scale-[0.98]"
                          }`}
                          onClick={() => handleFrequencyTypeChange("year")}
                        >
                          年
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div
              className={`border-t border-gray-100 ${
                isEditingInterval ? "mt-4" : "mt-0"
              }`}
            ></div>

            {/* Date range - placeholder for now */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 pl-2">日期</span>
                <div
                  className="flex items-center cursor-pointer px-2 py-1 rounded-lg"
                  onClick={() => setIsEditingDates(!isEditingDates)}
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" && setIsEditingDates(!isEditingDates)
                  }
                  aria-label="編輯日期"
                >
                  <span className="text-gray-800">
                    {formatDateForDisplay(editedTransaction.start_date)}
                    {editedTransaction.end_date && (
                      <span>
                        {` - ${formatDateForDisplay(
                          editedTransaction.end_date
                        )}`}
                      </span>
                    )}
                    {!editedTransaction.end_date && " 開始"}
                  </span>
                  {isEditingDates ? (
                    <ChevronUp className="ml-2 text-gray-400" />
                  ) : (
                    <ChevronDown className="ml-2 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Date range dropdown */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isEditingDates
                    ? "max-h-96 opacity-100 mt-4"
                    : "max-h-0 opacity-0 mt-0 mb-0 p-0"
                }`}
              >
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="space-y-4">
                    {/* Date type selection */}
                    <div className="flex">
                      <button
                        className={`flex-1 py-2 rounded-xl text-sm transition-all duration-150 ${
                          selectedDate === "start"
                            ? "bg-[#22c55e] text-white active:bg-green-600"
                            : "bg-gray-200 text-gray-600 active:bg-gray-300"
                        }`}
                        onClick={() => setSelectedDate("start")}
                      >
                        開始日期
                      </button>
                      <button
                        className={`flex-1 ml-2 py-2 rounded-xl text-sm transition-all duration-150 ${
                          selectedDate === "end"
                            ? "bg-blue-500 text-white active:bg-blue-600"
                            : "bg-gray-200 text-gray-600 active:bg-gray-300"
                        }`}
                        onClick={() => setSelectedDate("end")}
                      >
                        結束日期
                      </button>
                    </div>

                    {/* Calendar */}
                    <div className="p-3">
                      {/* Year and month selectors */}
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
                            value={calendarDate.getFullYear()}
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
                            value={calendarDate.getMonth()}
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

                      {/* Weekday headers */}
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

                      {/* Calendar days */}
                      <div className="grid grid-cols-7 gap-1">
                        {renderCalendar()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Name (備註) */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col space-y-2">
              <span className="text-gray-600 pl-2">備註</span>
              <div className="w-full">
                <textarea
                  value={editedTransaction.memo}
                  onChange={(e) => {
                    if (!editedTransaction) return;
                    setEditedTransaction({
                      ...editedTransaction,
                      memo: e.target.value,
                    });

                    // 自動調整高度
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  onFocus={(e) => {
                    // 聚焦時確保高度適應內容
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none border border-gray-300 text-gray-800 resize-none overflow-hidden min-h-[38px]"
                  placeholder="輸入備註"
                  rows={1}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-4 mt-8">
            {/* Save/Return button */}
            <button
              onClick={handleSave}
              className={`w-full py-3 rounded-2xl flex items-center justify-center ${
                isTemporaryTransaction(editedTransaction.id)
                  ? "bg-[#22c55e] text-white active:bg-green-600"
                  : hasChanges
                  ? "bg-[#22c55e] text-white active:bg-green-600"
                  : "bg-gray-200 text-gray-600 active:bg-gray-300"
              } transition-[background-color] duration-150`}
            >
              {isTemporaryTransaction(editedTransaction.id) ? (
                <>
                  <Plus size={20} className="mr-2" />
                  新增
                </>
              ) : hasChanges ? (
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

            {/* Delete button or Cancel button based on whether it's a new transaction */}
            <button
              onClick={handleDelete}
              className={`w-full py-3 rounded-2xl flex items-center justify-center ${
                isTemporaryTransaction(editedTransaction.id)
                  ? "bg-gray-200 text-gray-600 active:bg-gray-300"
                  : "bg-red-500 text-white active:bg-red-600"
              } transition-[background-color] duration-150`}
            >
              {isTemporaryTransaction(editedTransaction.id) ? (
                <>
                  <X size={20} className="mr-2" />
                  取消
                </>
              ) : (
                <>
                  <Trash2 size={20} className="mr-2" />
                  刪除
                </>
              )}
            </button>

            {/* Last updated timestamp - only show for existing transactions */}
            {!isTemporaryTransaction(editedTransaction.id) &&
              editedTransaction.updated_at && (
                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-400">
                    最後更新{" "}
                    {new Date(editedTransaction.updated_at).toLocaleString(
                      "zh-TW",
                      {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
