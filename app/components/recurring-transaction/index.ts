import RecurringTransactionManager from "./RecurringTransactionManager";
import {
  useRecurringTransactionManager,
  generateRecurringTransactionsForUser,
} from "./hooks";

// 導出來自 list 的類型和實用函數
import {
  RecurringTransaction,
  Category,
  GroupedTransactions,
  standardizeIntervalValue,
  isTemporaryTransaction,
  formatDate,
  formatRecurrence,
  calculateMonthlyAmount,
  createEmptyTransaction,
} from "./list";

// 導出來自 detail 的實用函數
import {
  formatDateForDisplay,
  showToastNotification,
  defaultCategories,
  fadeInAnimation,
} from "./detail";

// 導出元件
export {
  RecurringTransactionManager,
  useRecurringTransactionManager,
  generateRecurringTransactionsForUser,

  // list exports
  standardizeIntervalValue,
  isTemporaryTransaction,
  formatDate,
  formatRecurrence,
  calculateMonthlyAmount,
  createEmptyTransaction,

  // detail exports
  formatDateForDisplay,
  showToastNotification,
  defaultCategories,
  fadeInAnimation,
};

// 導出類型
export type { RecurringTransaction, Category, GroupedTransactions };

export default RecurringTransactionManager;
