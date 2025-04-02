import { useState, useEffect } from "react";
import { RecurringTransaction, Category } from "../list/types";
import { SUPABASE_URL, SUPABASE_KEY } from "@/utils/api";
import { isTemporaryTransaction } from "../list/utils";
import { defaultCategories } from "./constants";
import { getTaipeiDate } from "@/utils/date";

// Hook to manage transaction editing
export const useTransactionEditor = (
  transaction: RecurringTransaction | null,
  onSave: (transaction: RecurringTransaction) => void
) => {
  const [editedTransaction, setEditedTransaction] =
    useState<RecurringTransaction | null>(transaction);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [isEditingInterval, setIsEditingInterval] = useState(false);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [selectedDate, setSelectedDate] = useState<"start" | "end">("start");
  const [calendarDate, setCalendarDate] = useState(getTaipeiDate());
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isCategoryEditMode, setIsCategoryEditMode] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch categories from the database
  const fetchCategories = async () => {
    try {
      // 構建 API URL - Fixed to avoid duplication of rest/v1
      const url = `${SUPABASE_URL}/categories`;

      // 發送 API 請求
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }

      const data = await response.json();

      // 先找出用戶已刪除的類別名稱（包括系統預設類別）
      const userDeletedCategoryNames = data
        .filter(
          (cat: Category) =>
            cat.user_id === editedTransaction?.user_id && cat.is_deleted
        )
        .map((cat: Category) => cat.name);

      // 過濾類別:
      // 1. 包含未刪除的用戶自定義類別
      // 2. 包含未被用戶刪除的系統預設類別
      const filteredCategories = data.filter(
        (cat: Category) =>
          // 用戶自定義類別 - 未刪除的
          (cat.user_id === editedTransaction?.user_id && !cat.is_deleted) ||
          // 系統預設類別 - 未被用戶刪除的
          (cat.user_id === null && !userDeletedCategoryNames.includes(cat.name))
      );

      setDbCategories(filteredCategories);

      // 根據交易類型更新類別名稱列表
      if (editedTransaction) {
        updateCategoryNamesByType(filteredCategories, editedTransaction.type);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      // 如果獲取失敗，使用預設類別
      setCategories(defaultCategories);
    }
  };

  // 根據交易類型更新類別名稱列表
  const updateCategoryNamesByType = (
    cats: Category[],
    type: "income" | "expense"
  ) => {
    const filteredNames = cats
      .filter((cat) => cat.type === type)
      .map((cat) => cat.name);

    // 如果沒有找到任何類別，使用預設類別
    if (filteredNames.length === 0) {
      setCategories(defaultCategories);
    } else {
      setCategories(filteredNames);
    }
  };

  // Fetch categories when component mounts or transaction type changes
  useEffect(() => {
    if (editedTransaction) {
      fetchCategories();
    }
  }, [editedTransaction?.type]);

  // Update local state when transaction prop changes
  useEffect(() => {
    setEditedTransaction(transaction);
    if (transaction) {
      setEditName(transaction.memo);
      setEditAmount(transaction.amount.toString());
    }
  }, [transaction]);

  // Update hasChanges whenever editedTransaction changes
  useEffect(() => {
    if (editedTransaction && transaction) {
      const hasChanged =
        editedTransaction.memo !== transaction.memo ||
        editedTransaction.amount !== transaction.amount ||
        editedTransaction.type !== transaction.type ||
        editedTransaction.category !== transaction.category ||
        editedTransaction.interval !== transaction.interval ||
        editedTransaction.frequency !== transaction.frequency ||
        editedTransaction.start_date !== transaction.start_date ||
        editedTransaction.end_date !== transaction.end_date;

      setHasChanges(hasChanged);
    }
  }, [editedTransaction, transaction]);

  // Initialize calendar date based on selected date
  useEffect(() => {
    if (isEditingDates && editedTransaction) {
      try {
        const dateToUse =
          selectedDate === "start"
            ? editedTransaction.start_date
            : editedTransaction.end_date || editedTransaction.start_date;

        const date = new Date(dateToUse);
        if (!isNaN(date.getTime())) {
          setCalendarDate(date);
        }
      } catch (error) {
        // If there's an error parsing the date, use current date in Taipei timezone
        setCalendarDate(getTaipeiDate());
      }
    }
  }, [isEditingDates, selectedDate, editedTransaction]);

  return {
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
    fetchCategories,
  };
};
