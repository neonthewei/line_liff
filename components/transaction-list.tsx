"use client";

import { useEffect, useState, useMemo, memo, useRef } from "react";
import { ChevronRight, Bug } from "lucide-react";
import type { Transaction } from "@/types/transaction";
import { Skeleton } from "@/components/ui/skeleton";
import RecurringTransactionManager from "./recurring-transaction-manager";
import TransactionDetail from "./transaction-detail copy";
import { deleteTransactionApi, clearTransactionCache } from "@/utils/api";

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
    onDelete,
  }: {
    transaction: Transaction;
    onTransactionClick: (id: string, type: string) => void;
    showDebugInfo?: boolean;
    showTimestamp?: boolean;
    onDelete?: (id: string) => void;
  }) => {
    // Add refs to track touch position for distinguishing between scrolls and taps
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const isTouchMoveRef = useRef(false);
    const [isPressed, setIsPressed] = useState(false);
    const [translateX, setTranslateX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [showDeleteButton, setShowDeleteButton] = useState(false);
    const itemRef = useRef<HTMLDivElement>(null);
    const deleteThreshold = 100; // 刪除閾值
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false); // 新增狀態來控制項目是否已被刪除
    const [isAnimatingOut, setIsAnimatingOut] = useState(false); // 控制刪除動畫
    const contentRef = useRef<HTMLDivElement>(null); // 內容區域參考

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
      setIsPressed(true);
      setIsDragging(true);
    };

    // Handle touch move - update position
    const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      // 如果垂直移動超過閾值，取消滑動
      if (deltaY > 10) {
        setIsDragging(false);
        setTranslateX((prevX) => (prevX > 0 ? prevX : 0)); // 保持當前位置，不要重置
        return;
      }

      // 設置滑動狀態
      setIsDragging(true);

      // 如果已經顯示刪除按鈕，允許向左滑動恢復原位
      if (showDeleteButton) {
        // 允許範圍: 0 到 deleteThreshold
        const newX = Math.max(
          0,
          Math.min(deleteThreshold, deltaX + deleteThreshold)
        );
        setTranslateX(newX);

        // 如果向左滑動超過一半，關閉刪除按鈕狀態
        if (newX < deleteThreshold / 2) {
          setShowDeleteButton(false);
        } else {
          setShowDeleteButton(true);
        }
      } else {
        // 正常的向右滑動，限制範圍 0 到 deleteThreshold
        const newTranslateX = Math.max(0, Math.min(deleteThreshold, deltaX));
        setTranslateX(newTranslateX);
      }
    };

    // Handle touch end - stop at threshold to show delete button or return to original position
    const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartRef.current) {
        setIsDragging(false);
        return;
      }

      // 如果不是滑動狀態，可能是點擊
      if (!isDragging) {
        if (!isTouchMoveRef.current) {
          setIsPressed(true);
          setTimeout(() => {
            onTransactionClick(transaction.id, transaction.type);
            setIsPressed(false);
          }, 150);
        }
      } else {
        // 決定最終位置 - 小於一半回彈，大於一半顯示刪除
        if (translateX < deleteThreshold / 2) {
          // 回彈到原位
          setTranslateX(0);
          setShowDeleteButton(false);
        } else {
          // 保持在刪除位置
          setTranslateX(deleteThreshold);
          setShowDeleteButton(true);
        }
      }

      setIsDragging(false);
      touchStartRef.current = null;
      isTouchMoveRef.current = false;
      setIsPressed(false);
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

    // 處理點擊刪除按鈕
    const handleDeleteButtonClick = async (e: React.MouseEvent) => {
      e.stopPropagation(); // 阻止事件冒泡，避免觸發項目點擊

      if (!onDelete) return;

      setIsDeleting(true);
      try {
        // 調用 API 刪除交易記錄
        const success = await deleteTransactionApi(
          transaction.id,
          transaction.type
        );

        if (success) {
          // 觸發刪除動畫
          setIsAnimatingOut(true);

          // 等待動畫完成後才真正移除元素
          setTimeout(() => {
            setIsDeleted(true);
          }, 500); // 500ms 與 CSS 過渡時間一致
        } else {
          // 如果失敗，重置 translateX
          setTranslateX(0);
          setShowDeleteButton(false);
          console.error("刪除交易失敗");
        }
      } catch (error) {
        console.error("刪除交易時發生錯誤:", error);
        setTranslateX(0);
        setShowDeleteButton(false);
      } finally {
        setIsDeleting(false);
      }
    };

    // 點擊其他地方時重置滑動狀態
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          showDeleteButton &&
          itemRef.current &&
          !itemRef.current.contains(e.target as Node)
        ) {
          setTranslateX(0);
          setShowDeleteButton(false);
        }
      };

      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }, [showDeleteButton]);

    // 如果已刪除，則不渲染此項目
    if (isDeleted) {
      return null;
    }

    // 定義刪除動畫樣式
    const deleteAnimationStyle = isAnimatingOut
      ? {
          opacity: 0,
          maxHeight: "0px",
          marginTop: "0px",
          marginBottom: "0px",
          paddingTop: "0px",
          paddingBottom: "0px",
          overflow: "hidden",
          transition: "all 500ms ease",
        }
      : {
          opacity: 1,
          maxHeight: "200px", // 足夠大的高度
          transition: "all 500ms ease",
        };

    return (
      <div className="relative overflow-hidden" style={deleteAnimationStyle}>
        {/* 刪除按鈕背景 */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[100px] bg-red-500 flex items-center justify-center"
          style={{
            transform: `translateX(${translateX > 0 ? 0 : -100}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
          onClick={showDeleteButton ? handleDeleteButtonClick : undefined}
        >
          <span className="text-white text-sm">
            {isDeleting ? "刪除中..." : "刪除"}
          </span>
        </div>

        {/* 交易項目內容 */}
        <div
          ref={itemRef}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          role="button"
          tabIndex={0}
          aria-label={`${transaction.category} ${transaction.amount}`}
          onKeyDown={handleKeyDown}
          className={`relative px-4 py-3 flex items-center justify-between cursor-pointer transition-colors duration-150 bg-white ${
            isPressed ? "bg-gray-100" : ""
          }`}
          style={{
            transform: `translateX(${translateX}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
            zIndex: 1,
          }}
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
      </div>
    );
  }
);

TransactionItem.displayName = "TransactionItem";

// Enhanced skeleton loader for transaction items with custom animation
export const TransactionSkeleton = () => {
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
export const HeaderSkeleton = () => {
  return (
    <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-50">
      <Skeleton className="h-5 w-24 animate-pulse-color" />
      <Skeleton className="h-4 w-16 animate-pulse-color" />
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

  // 簡化處理交易刪除邏輯 - 只做標記，不更新列表
  const handleDeleteTransaction = async (id: string) => {
    // 實際上不做任何事情，因為刪除操作已在 TransactionItem 內部處理
    // 如果未來需要同步刪除狀態，可以在這裡添加代碼
  };

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
                        onDelete={handleDeleteTransaction}
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
