"use client";

import RecurringList from "./list/RecurringList";
import RecurringDetail from "./detail/RecurringDetail";
import { useRecurringTransactionManager } from "./hooks";

interface RecurringTransactionManagerProps {
  userId: string;
  onClose: () => void;
  onDataChanged?: () => void;
}

export default function RecurringTransactionManager({
  userId,
  onClose,
  onDataChanged,
}: RecurringTransactionManagerProps) {
  const {
    selectedTransaction,
    isEditing,
    isCreating,
    handleCreateTransaction,
    handleCloseEditor,
    handleTransactionClick,
    handleSaveNewTransaction,
    handleSaveTransaction,
    handleDeleteTransaction,
  } = useRecurringTransactionManager(userId, onClose, onDataChanged);

  // 自定義關閉處理器，確保在退出管理頁面時觸發數據刷新
  const handleManagerClose = () => {
    // 當用戶直接關閉管理器時，通知數據變更並關閉
    if (onDataChanged) {
      onDataChanged();
    }
    // 這裡調用 onClose 會真正退出整個管理器
    onClose();
  };

  // If editing or creating a transaction, show the editor
  if ((isEditing || isCreating) && selectedTransaction) {
    return (
      <RecurringDetail
        transaction={selectedTransaction}
        onClose={handleCloseEditor}
        onSave={isCreating ? handleSaveNewTransaction : handleSaveTransaction}
        onDelete={handleDeleteTransaction}
      />
    );
  }

  // Show the list if not editing or creating
  return (
    <RecurringList
      userId={userId}
      onClose={handleManagerClose}
      onDataChanged={onDataChanged}
      onSelect={handleTransactionClick}
      onCreate={handleCreateTransaction}
    />
  );
}
