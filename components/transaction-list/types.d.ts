// 导入共享类型
import type { Transaction } from "@/types/transaction";

// TransactionList 组件的属性
export interface TransactionListProps {
  transactions: Transaction[];
  currentDate: Date;
  activeTab: "general" | "fixed";
  isLoading?: boolean;
  onTransactionClick: (id: string) => void;
  showDebugInfo?: boolean;
  userId: string;
  onTransactionUpdate?: (transactions: Transaction[]) => void;
}

// TransactionItem 组件的属性
export interface TransactionItemProps {
  transaction: Transaction;
  onTransactionClick: (id: string) => void;
  showDebugInfo?: boolean;
  showTimestamp?: boolean;
  onDelete?: (id: string) => void;
  onSwipeStateChange: (isOpen: boolean, id: string) => void;
  shouldClose: boolean;
}

// 调试面板组件的属性
export interface DebugPanelProps {
  isDebugMode: boolean;
  isDebugCollapsed: boolean;
  setIsDebugCollapsed: (collapsed: boolean) => void;
  activeTab: "general" | "fixed";
  isLoading: boolean;
  isTabSwitching: boolean;
  transactionsCount: number;
  currentDate: Date;
  displayTransactionsCount: number;
}

// 触摸信息类型
export interface TouchInfo {
  x: number;
  y: number;
  time?: number;
  lastX?: number;
}

// 扩展 Window 接口，添加滚动锁定/解锁方法
declare global {
  interface Window {
    lockBodyScroll?: () => void;
    unlockBodyScroll?: () => void;
  }
}
