import { useState } from "react";
import { SUPABASE_URL, SUPABASE_KEY } from "@/utils/api";
import {
  RecurringTransaction,
  createEmptyTransaction,
  standardizeIntervalValue,
} from "./list";

// 定義 hook 的返回類型
interface UseRecurringTransactionManagerReturn {
  selectedTransaction: RecurringTransaction | null;
  isEditing: boolean;
  isCreating: boolean;
  handleCreateTransaction: () => void;
  handleCloseEditor: () => void;
  handleTransactionClick: (transaction: RecurringTransaction) => void;
  handleSaveNewTransaction: (
    newTransaction: RecurringTransaction
  ) => Promise<void>;
  handleSaveTransaction: (
    updatedTransaction: RecurringTransaction
  ) => Promise<void>;
  handleDeleteTransaction: (transactionId: string | number) => Promise<void>;
}

export const useRecurringTransactionManager = (
  userId: string,
  onClose: () => void,
  onDataChanged?: () => void
): UseRecurringTransactionManagerReturn => {
  const [selectedTransaction, setSelectedTransaction] =
    useState<RecurringTransaction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Handle creating a new transaction
  const handleCreateTransaction = () => {
    setSelectedTransaction(createEmptyTransaction(userId));
    setIsCreating(true);
  };

  // Handle close editor
  const handleCloseEditor = () => {
    setIsEditing(false);
    setIsCreating(false);
    setSelectedTransaction(null);
  };

  // Handle click on a recurring transaction
  const handleTransactionClick = (transaction: RecurringTransaction) => {
    setSelectedTransaction(transaction);
    setIsEditing(true);
  };

  // Handle save new transaction
  const handleSaveNewTransaction = async (
    newTransaction: RecurringTransaction
  ) => {
    try {
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error("Supabase credentials not found");
      }

      // Standardize the interval value
      const standardizedInterval = standardizeIntervalValue(
        newTransaction.interval
      );

      // Create transaction in Supabase
      const response = await fetch(`${SUPABASE_URL}/recurring`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Prefer: "return=representation",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          user_id: userId,
          memo: newTransaction.memo || "未命名",
          amount: newTransaction.amount,
          type: newTransaction.type,
          category: newTransaction.category,
          interval: standardizedInterval,
          frequency: newTransaction.frequency,
          start_date: newTransaction.start_date,
          end_date: newTransaction.end_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to create transaction: ${response.status} ${response.statusText}`
        );
      }

      // Close editor
      setIsCreating(false);
      setSelectedTransaction(null);

      // Generate recurring transactions (this would be handled by hook in RecurringList)
      await generateRecurringTransactionsForUser(userId);

      // Notify parent about data change
      if (onDataChanged) onDataChanged();
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };

  // Handle save transaction
  const handleSaveTransaction = async (
    updatedTransaction: RecurringTransaction
  ) => {
    try {
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error("Supabase credentials not found");
      }

      // Standardize the interval value
      const standardizedInterval = standardizeIntervalValue(
        updatedTransaction.interval
      );

      // Update transaction in Supabase
      const response = await fetch(
        `${SUPABASE_URL}/recurring?id=eq.${updatedTransaction.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Prefer: "return=minimal",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            memo: updatedTransaction.memo,
            amount: updatedTransaction.amount,
            type: updatedTransaction.type,
            category: updatedTransaction.category,
            interval: standardizedInterval,
            frequency: updatedTransaction.frequency,
            start_date: updatedTransaction.start_date,
            end_date: updatedTransaction.end_date,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to update transaction: ${response.status} ${response.statusText}`
        );
      }

      // Close editor
      setIsEditing(false);
      setSelectedTransaction(null);

      // Generate recurring transactions for this user after update
      await generateRecurringTransactionsForUser(userId);

      // Notify parent about data change
      if (onDataChanged) onDataChanged();
    } catch (error) {
      console.error("Error updating transaction:", error);
    }
  };

  // Handle delete transaction
  const handleDeleteTransaction = async (transactionId: string | number) => {
    try {
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error("Supabase credentials not found");
      }

      // Delete transaction from Supabase
      const response = await fetch(
        `${SUPABASE_URL}/recurring?id=eq.${transactionId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete transaction: ${response.statusText}`);
      }

      // Close editor
      setIsEditing(false);
      setIsCreating(false);
      setSelectedTransaction(null);

      // Notify parent about data change
      if (onDataChanged) onDataChanged();
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  return {
    selectedTransaction,
    isEditing,
    isCreating,
    handleCreateTransaction,
    handleCloseEditor,
    handleTransactionClick,
    handleSaveNewTransaction,
    handleSaveTransaction,
    handleDeleteTransaction,
  };
};

// API 相關功能抽取為獨立函數
export const generateRecurringTransactionsForUser = async (
  userId: string
): Promise<boolean> => {
  try {
    // 使用 POST 請求
    const response = await fetch("/api/generate-recurring-transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      // 嘗試使用 GET 請求
      const getResponse = await fetch(
        `/api/generate-recurring-transactions?userId=${encodeURIComponent(
          userId
        )}`
      );

      if (!getResponse.ok) {
        return false;
      }
      return true;
    }

    return true;
  } catch (error) {
    console.error("❌ 生成固定收支交易時發生錯誤:", error);
    return false;
  }
};
