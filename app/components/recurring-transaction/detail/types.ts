import { RecurringTransaction, Category } from "../list/types";

export interface RecurringDetailProps {
  transaction: RecurringTransaction | null;
  onClose: () => void;
  onSave: (transaction: RecurringTransaction) => void;
  onDelete: (transactionId: string | number) => void;
}

export type ToastType = "success" | "error";
