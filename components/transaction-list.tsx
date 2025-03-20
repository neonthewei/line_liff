"use client";

import { useEffect, useState, useMemo, memo, useRef } from "react";
import { ChevronRight, Bug } from "lucide-react";
import type { Transaction } from "@/types/transaction";
import { Skeleton } from "@/components/ui/skeleton";
import RecurringTransactionManager from "./recurring-transaction-manager";
import TransactionDetail from "./transaction-detail copy";

interface TransactionListProps {
  transactions: Transaction[];
  currentDate: Date;
  activeTab: "general" | "fixed";
  isLoading?: boolean;
  isCollapsed?: boolean;
  onTransactionClick: (id: string, type: string) => void;
  showDebugInfo?: boolean;
  userId: string;
  onTransactionUpdate?: (transactions: Transaction[]) => void;
}

// Memoized transaction item component to prevent unnecessary re-renders
const TransactionItem = memo(
  ({
    transaction,
    onTransactionClick,
    showDebugInfo = false,
    showTimestamp = false,
  }: {
    transaction: Transaction;
    onTransactionClick: (id: string, type: string) => void;
    showDebugInfo?: boolean;
    showTimestamp?: boolean;
  }) => {
    // Add refs to track touch position for distinguishing between scrolls and taps
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const isTouchMoveRef = useRef(false);
    const [isPressed, setIsPressed] = useState(false);

    // Format timestamp to a user-friendly format
    const formatTimestamp = (timestamp: string | undefined): string => {
      if (!timestamp) return "";

      try {
        const date = new Date(timestamp);

        // Check if date is valid
        if (isNaN(date.getTime())) return "";

        // Format: YYYY-MM-DD HH:MM
        return date
          .toLocaleString("zh-TW", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
          .replace(/\//g, "-");
      } catch (error) {
        console.error("Error formatting timestamp:", error);
        return "";
      }
    };

    // Get the formatted timestamp (prefer updated_at, fallback to created_at)
    const timestamp = formatTimestamp(
      transaction.updated_at || transaction.created_at
    );

    // Handle mouse click
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Call the click handler with a small delay to prevent UI flicker
      setTimeout(() => {
        onTransactionClick(transaction.id, transaction.type);
      }, 10);
    };

    // Handle touch start - record starting position
    const handleTouchStart = (e: React.TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      isTouchMoveRef.current = false;
      setIsPressed(true); // Show visual feedback immediately on touch
    };

    // Handle touch move - mark as scrolling if moved more than threshold
    const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      // If moved more than 10px in any direction, consider it a scroll
      if (deltaX > 10 || deltaY > 10) {
        isTouchMoveRef.current = true;
        setIsPressed(false); // Remove visual feedback when scrolling is detected
      }
    };

    // Handle touch end - only trigger click if not scrolling
    const handleTouchEnd = (e: React.TouchEvent) => {
      // Don't call preventDefault() here as it can interfere with scroll events

      // Only trigger click if it wasn't a scroll
      if (touchStartRef.current && !isTouchMoveRef.current) {
        // Add visual feedback for tap
        setIsPressed(true);

        // Small delay to ensure we don't interfere with any ongoing browser actions
        setTimeout(() => {
          onTransactionClick(transaction.id, transaction.type);
          setIsPressed(false); // Remove visual feedback after click is processed
        }, 150); // Slightly longer delay to show the visual feedback
      } else {
        setIsPressed(false);
      }

      // Reset touch tracking
      touchStartRef.current = null;
    };

    // Handle touch cancel - reset state
    const handleTouchCancel = () => {
      touchStartRef.current = null;
      isTouchMoveRef.current = false;
      setIsPressed(false);
    };

    // Separate handler for keyboard events
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsPressed(true);

        setTimeout(() => {
          onTransactionClick(transaction.id, transaction.type);
          setIsPressed(false);
        }, 150);
      }
    };

    return (
      <div
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        role="button"
        tabIndex={0}
        aria-label={`${transaction.category} ${transaction.amount}`}
        onKeyDown={handleKeyDown}
        className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors duration-150 ${
          isPressed ? "bg-gray-100" : ""
        }`}
      >
        <div className="flex items-center">
          <div className="pl-1">
            <div
              className={`font-medium ${
                transaction.type === "expense"
                  ? "text-green-600"
                  : "text-blue-600"
              }`}
            >
              {transaction.category}
            </div>
            {transaction.note && (
              <div className="text-xs text-gray-500 mt-0.5">
                {transaction.note}
              </div>
            )}

            {/* Display updated_at timestamp only when showTimestamp is true */}
            {showTimestamp && timestamp && (
              <div className="text-xs text-gray-400 mt-0.5 animate-fadeIn">
                {transaction.updated_at ? "更新於: " : "建立於: "}
                {timestamp}
              </div>
            )}

            {/* Debug information */}
            {showDebugInfo && (
              <div className="text-xs text-gray-400 mt-1 bg-gray-50 p-1 rounded">
                <div>ID: {transaction.id}</div>
                <div>Raw Date: {transaction.date}</div>
                <div>Is Fixed: {transaction.isFixed ? "Yes" : "No"}</div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <div className="text-lg font-bold mr-2 text-gray-900">
            {transaction.type === "expense" ? "-" : "+"}$
            {Math.abs(transaction.amount)}
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    );
  }
);

TransactionItem.displayName = "TransactionItem";

// Enhanced skeleton loader for transaction items with custom animation
const TransactionSkeleton = () => {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <div>
          <Skeleton className="h-5 w-24 mb-1 animate-pulse-color" />
          <Skeleton className="h-3 w-32 animate-pulse-color" />
        </div>
      </div>
      <div className="flex items-center">
        <Skeleton className="h-6 w-16 mr-2 animate-pulse-color" />
        <Skeleton className="h-5 w-5 rounded animate-pulse-color" />
      </div>
    </div>
  );
};

// Skeleton for the header section
const HeaderSkeleton = () => {
  return (
    <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-50">
      <Skeleton className="h-5 w-24 animate-pulse-color" />
      <Skeleton className="h-4 w-16 animate-pulse-color" />
    </div>
  );
};

// Skeleton for empty state
const EmptyStateSkeleton = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Skeleton className="h-6 w-48 mb-2 animate-pulse-color" />
      <Skeleton className="h-4 w-32 animate-pulse-color" />
    </div>
  );
};

// Define a consistent animation style for all content blocks
const fadeInAnimation = {
  // 移除動畫效果，讓元素直接顯示
};

export default function TransactionList({
  transactions,
  currentDate,
  activeTab,
  isLoading = false,
  isCollapsed = false,
  onTransactionClick,
  showDebugInfo = false,
  userId,
  onTransactionUpdate,
}: TransactionListProps) {
  const prevTabRef = useRef(activeTab);
  const isTabSwitching = prevTabRef.current !== activeTab;
  const transactionClickedRef = useRef(false);
  const [isDebugMode, setIsDebugMode] = useState(showDebugInfo);
  const [showAllTimestamps, setShowAllTimestamps] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [showRecurringManager, setShowRecurringManager] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  // 添加全局鍵盤事件監聽器，用於切換所有時間戳顯示
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 檢查是否按下 'o' 或 'O' 鍵
      if (e.key.toLowerCase() === "o") {
        setShowAllTimestamps((prev) => !prev);
      }
    };

    // 添加事件監聽器
    window.addEventListener("keydown", handleGlobalKeyDown);

    // 清理函數
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  // Update debug mode when prop changes
  useEffect(() => {
    setIsDebugMode(showDebugInfo);
  }, [showDebugInfo]);

  // Toggle debug mode function
  const handleToggleDebugMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDebugMode((prev) => !prev);
  };

  // Update the previous tab reference when activeTab changes and reset animation
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      // Tab is changing, trigger animation reset
      setAnimationKey((prev) => prev + 1);

      // Set a small delay before updating the previous tab reference
      // This ensures animations have time to reset properly
      const timer = setTimeout(() => {
        prevTabRef.current = activeTab;
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Handle transaction click
  const handleTransactionClick = (id: string, type: string) => {
    const transaction = transactions.find((t) => t.id === id);
    if (transaction) {
      setSelectedTransaction(transaction);
    }
  };

  // Handle closing the detail view
  const handleCloseDetail = () => {
    setSelectedTransaction(null);
  };

  // Memoized transaction processing
  const { groupedTransactions } = useMemo(() => {
    if (transactions.length === 0) {
      return {
        groupedTransactions: {},
      };
    }

    // 根據選定的標籤過濾數據
    const filteredData = transactions.filter((transaction) =>
      activeTab === "general" ? !transaction.isFixed : transaction.isFixed
    );

    // 所有記錄按日期分組（不論是一般還是定期）
    const groupedByDate: Record<string, Transaction[]> = {};
    filteredData.forEach((transaction) => {
      // 從 "YYYY年MM月DD日" 格式解析日期
      let date: string;
      try {
        // 首先檢查 transaction.date 是否存在
        if (!transaction.date) {
          console.error("交易日期缺失:", transaction);
          date = new Date().toISOString().split("T")[0];
        } else {
          // 嘗試匹配 "YYYY年MM月DD日" 格式
          const match = transaction.date.match(/(\d+)年(\d+)月(\d+)日/);
          if (match) {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]) - 1; // JavaScript 月份從 0 開始
            const day = parseInt(match[3]);

            // 檢查解析出的日期是否有效
            if (
              isNaN(year) ||
              isNaN(month) ||
              isNaN(day) ||
              year < 1900 ||
              year > 2100 ||
              month < 0 ||
              month > 11 ||
              day < 1 ||
              day > 31
            ) {
              console.error("日期解析結果無效:", year, month, day);
              date = new Date().toISOString().split("T")[0];
            } else {
              // Create date at noon to avoid timezone issues
              const txDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
              date = txDate.toISOString().split("T")[0];
            }
          } else if (
            transaction.date.includes("-") &&
            transaction.date.length >= 10
          ) {
            // 嘗試解析 ISO 格式日期 (YYYY-MM-DD)
            const parts = transaction.date.substring(0, 10).split("-");
            if (parts.length === 3) {
              const year = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1;
              const day = parseInt(parts[2]);

              if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                const txDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
                date = txDate.toISOString().split("T")[0];
              } else {
                date = new Date().toISOString().split("T")[0];
              }
            } else {
              date = new Date().toISOString().split("T")[0];
            }
          } else {
            // 嘗試直接解析日期字符串
            const txDate = new Date(transaction.date);
            if (!isNaN(txDate.getTime())) {
              date = txDate.toISOString().split("T")[0];
            } else {
              console.error("無法解析日期格式:", transaction.date);
              date = new Date().toISOString().split("T")[0];
            }
          }
        }
      } catch (error) {
        console.error("日期解析錯誤:", error, transaction.date);
        // 如果解析失敗，使用當前日期
        date = new Date().toISOString().split("T")[0];
      }

      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(transaction);
    });

    // 對每個日期組內的交易按 updated_at 排序
    Object.keys(groupedByDate).forEach((date) => {
      groupedByDate[date].sort((a, b) => {
        // 如果沒有 updated_at，則使用 created_at
        const aTime = a.updated_at || a.created_at || "";
        const bTime = b.updated_at || b.created_at || "";

        // 如果都沒有時間戳，保持原順序
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;

        // 比較時間戳，降序排列（最新的在前）
        return bTime.localeCompare(aTime);
      });
    });

    return {
      groupedTransactions: groupedByDate,
    };
  }, [transactions, activeTab]);

  // Debug panel component
  const DebugPanel = () => {
    if (!isDebugMode) return null;

    return (
      <div className="bg-gray-900 text-white p-4 mb-4 rounded-lg text-xs font-mono">
        <div className="text-center text-xl font-bold mb-4">應用調試信息</div>

        {/* Basic debug information */}
        <div className="bg-gray-800 p-3 rounded-lg mb-4">
          <div className="font-bold mb-2">Debug Information:</div>
          <div>Active Tab: {activeTab}</div>
          <div>Is Loading: {isLoading ? "Yes" : "No"}</div>
          <div>Is Tab Switching: {isTabSwitching ? "Yes" : "No"}</div>
          <div>Is Collapsed: {isCollapsed ? "Yes" : "No"}</div>
          <div>Transaction Count: {transactions.length}</div>
          <div>Current Date: {currentDate.toISOString()}</div>
          <div>Date Groups: {Object.keys(groupedTransactions).length}</div>
        </div>
      </div>
    );
  };

  // Render enhanced skeleton loaders during loading, but not during tab switching
  if (isLoading && !isTabSwitching) {
    return (
      <>
        <DebugPanel />
        <div className="space-y-4 pb-4">
          {[
            { id: 1, items: 3 },
            { id: 2, items: 2 },
            { id: 3, items: 4 },
          ].map((group) => (
            <div
              key={`skeleton-group-${group.id}`}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
              style={{
                ...fadeInAnimation,
                animationDelay: "0ms",
              }}
            >
              <HeaderSkeleton />
              <div className="divide-y divide-gray-100">
                {Array.from({ length: group.items }).map((_, item) => (
                  <TransactionSkeleton
                    key={`skeleton-item-${group.id}-${item}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  // 檢查是否有交易記錄
  if (Object.keys(groupedTransactions).length === 0) {
    return (
      <>
        <DebugPanel />
        <div className="text-center py-8 text-gray-500 animate-fadeIn">
          {activeTab === "general" ? "本月尚無一般記錄" : "本月尚無定期記錄"}
        </div>
        {activeTab === "fixed" && (
          <div className="fixed bottom-0 left-0 right-0 pt-4 px-4 pb-6 bg-gray-100 before:content-[''] before:absolute before:left-0 before:right-0 before:top-[-20px] before:h-[20px] before:bg-gradient-to-t before:from-gray-100 before:to-transparent">
            <div className="max-w-md mx-auto">
              <button
                className="w-full py-3 rounded-2xl bg-gray-200 text-gray-600 flex items-center justify-center transition-colors duration-150 active:bg-gray-300"
                onClick={() => setShowRecurringManager(true)}
              >
                管理定期收支
              </button>
            </div>
          </div>
        )}
        {showRecurringManager && (
          <RecurringTransactionManager
            userId={userId}
            onClose={() => setShowRecurringManager(false)}
          />
        )}
      </>
    );
  }

  // 所有記錄（一般和定期）都使用相同的日期分組顯示邏輯
  return (
    <>
      <DebugPanel />
      <div
        className={`space-y-4 ${activeTab === "fixed" ? "pb-24" : "pb-4"}`}
        key={animationKey}
      >
        {Object.entries(groupedTransactions)
          .sort(
            ([dateA], [dateB]) =>
              new Date(dateB).getTime() - new Date(dateA).getTime()
          )
          .map(([date, dayTransactions], groupIndex) => {
            // 計算當天的支出和收入總額
            const expenseTotal = dayTransactions
              .filter((tx) => tx.type === "expense")
              .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

            const incomeTotal = dayTransactions
              .filter((tx) => tx.type === "income")
              .reduce((sum, tx) => sum + tx.amount, 0);

            const formattedDate = new Date(date).toLocaleDateString("zh-TW", {
              month: "2-digit",
              day: "2-digit",
              weekday: "short",
            });

            return (
              <div
                key={`date-${date}`}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
                style={{
                  ...fadeInAnimation,
                  animationDelay: "0ms",
                }}
              >
                <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-50">
                  <div className="font-medium text-base text-gray-700">
                    {formattedDate}
                  </div>
                  <div className="text-xs text-gray-500">
                    {/* 計算淨額（收入減去支出） */}
                    {(() => {
                      const netAmount = incomeTotal - expenseTotal;
                      const prefix = netAmount >= 0 ? "+" : "-";
                      return `${prefix}$${Math.abs(netAmount)}`;
                    })()}
                  </div>
                </div>

                <div
                  className={`${
                    isCollapsed ? "hidden" : "block"
                  } overflow-hidden`}
                  style={
                    {
                      // 移除過渡效果
                    }
                  }
                >
                  <div className="divide-y divide-gray-100">
                    {dayTransactions.map((transaction, index) => (
                      <TransactionItem
                        key={`tx-${transaction.id}-${index}`}
                        transaction={transaction}
                        onTransactionClick={handleTransactionClick}
                        showDebugInfo={isDebugMode}
                        showTimestamp={showAllTimestamps}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

        {/* 管理定期收支按鈕 - 只在定期標籤顯示 */}
        {activeTab === "fixed" && (
          <div className="fixed bottom-0 left-0 right-0 pt-4 px-4 pb-6 bg-gray-100 before:content-[''] before:absolute before:left-0 before:right-0 before:top-[-20px] before:h-[20px] before:bg-gradient-to-t before:from-gray-100 before:to-transparent">
            <div className="max-w-md mx-auto">
              <button
                className="w-full py-3 rounded-2xl bg-gray-200 text-gray-600 flex items-center justify-center transition-colors duration-150 active:bg-gray-300"
                onClick={() => setShowRecurringManager(true)}
              >
                管理定期收支
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Render the recurring transaction manager when showRecurringManager is true */}
      {showRecurringManager && (
        <RecurringTransactionManager
          userId={userId}
          onClose={() => setShowRecurringManager(false)}
        />
      )}

      {/* Transaction Detail */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-white">
          <TransactionDetail
            transaction={selectedTransaction}
            onBack={async () => {
              handleCloseDetail();
            }}
            onUpdate={(updatedTransaction) => {
              // 只在真正有更新時觸發一次更新
              if (onTransactionUpdate) {
                // 更新本地的交易記錄
                const updatedTransactions = transactions.map((t) =>
                  t.id === updatedTransaction.id ? updatedTransaction : t
                );

                // 觸發父組件重新獲取數據
                onTransactionUpdate(updatedTransactions);
              }
            }}
            onDelete={() => {
              // 刪除時觸發更新
              if (onTransactionUpdate) {
                const updatedTransactions = transactions.filter(
                  (t) => t.id !== selectedTransaction.id
                );
                onTransactionUpdate(updatedTransactions);
              }
              handleCloseDetail();
            }}
          />
        </div>
      )}
    </>
  );
}
