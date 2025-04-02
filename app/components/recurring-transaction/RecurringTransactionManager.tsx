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
      onClose={onClose}
      onDataChanged={onDataChanged}
      onSelect={handleTransactionClick}
      onCreate={handleCreateTransaction}
    />
  );
}
