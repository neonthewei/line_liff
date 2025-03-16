"use client"

import { useEffect, useState, useMemo, memo, useRef } from "react"
import { ChevronRight, Bug } from "lucide-react"
import type { Transaction } from "@/types/transaction"
import { Skeleton } from "@/components/ui/skeleton"

interface TransactionListProps {
  transactions: Transaction[]
  currentDate: Date
  activeTab: "general" | "fixed"
  isLoading?: boolean
  isCollapsed?: boolean
  onTransactionClick: (id: string, type: string) => void
  showDebugInfo?: boolean
}

// Memoized transaction item component to prevent unnecessary re-renders
const TransactionItem = memo(({ 
  transaction, 
  onTransactionClick,
  showDebugInfo = false
}: { 
  transaction: Transaction, 
  onTransactionClick: (id: string, type: string) => void,
  showDebugInfo?: boolean
}) => {
  // Add refs to track touch position for distinguishing between scrolls and taps
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchMoveRef = useRef(false);
  const [isPressed, setIsPressed] = useState(false);
  
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
    if (e.key === 'Enter' || e.key === ' ') {
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
        isPressed ? 'bg-gray-100' : ''
      }`}
    >
      <div className="flex items-center">
        <div>
          <div className={`font-medium ${transaction.type === "expense" ? "text-green-600" : "text-blue-600"}`}>{transaction.category}</div>
          {transaction.note && <div className="text-xs text-gray-500 mt-0.5">{transaction.note}</div>}
          
          {/* Debug information */}
          {showDebugInfo && (
            <div className="text-xs text-gray-400 mt-1 bg-gray-50 p-1 rounded">
              <div>ID: {transaction.id}</div>
              <div>Raw Date: {transaction.date}</div>
              <div>Is Fixed: {transaction.isFixed ? 'Yes' : 'No'}</div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center">
        <div className="text-lg font-bold mr-2 text-gray-900">
          {transaction.type === "expense" ? "-" : "+"}${Math.abs(transaction.amount).toFixed(2)}
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
});

TransactionItem.displayName = 'TransactionItem';

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
    <div className="flex justify-between items-center px-5 py-3 border-b">
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
  opacity: 0,
  animation: 'fadeIn 0.3s ease-out forwards' // Reduced from 0.5s to 0.3s for faster animation
};

export default function TransactionList({ 
  transactions, 
  currentDate, 
  activeTab,
  isLoading = false,
  isCollapsed = false,
  onTransactionClick,
  showDebugInfo = false
}: TransactionListProps) {
  const [isProcessing, setIsProcessing] = useState(true);
  const prevTabRef = useRef(activeTab);
  const isTabSwitching = prevTabRef.current !== activeTab;
  const transactionClickedRef = useRef(false);
  const [isDebugMode, setIsDebugMode] = useState(showDebugInfo);
  
  // Update debug mode when prop changes
  useEffect(() => {
    setIsDebugMode(showDebugInfo);
  }, [showDebugInfo]);
  
  // Toggle debug mode function
  const handleToggleDebugMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDebugMode(prev => !prev);
  };
  
  // Update the previous tab reference when activeTab changes
  useEffect(() => {
    prevTabRef.current = activeTab;
  }, [activeTab]);
  
  // Wrap the onTransactionClick to track when a transaction is clicked
  const handleTransactionClick = (id: string, type: string) => {
    transactionClickedRef.current = true;
    onTransactionClick(id, type);
    
    // Reset the flag after a short delay
    setTimeout(() => {
      transactionClickedRef.current = false;
    }, 500);
  };
  
  // Memoized transaction processing
  const { groupedTransactions, groupedFixedTransactions } = useMemo(() => {
    if (transactions.length === 0) {
      return { 
        groupedTransactions: {}, 
        groupedFixedTransactions: { expense: [], income: [] } 
      };
    }

    // 根據選定的標籤過濾數據
    const filteredData = transactions.filter((transaction) => 
      (activeTab === "general" ? !transaction.isFixed : transaction.isFixed)
    );
    
    // 如果是固定支出/收入標籤，按類型分組
    if (activeTab === "fixed") {
      const expenseTransactions = filteredData.filter(tx => tx.type === "expense");
      const incomeTransactions = filteredData.filter(tx => tx.type === "income");
      
      return {
        groupedTransactions: {},
        groupedFixedTransactions: {
          expense: expenseTransactions,
          income: incomeTransactions
        }
      };
    }
    
    // 一般記錄按日期分組
    const groupedByDate: Record<string, Transaction[]> = {};
    filteredData.forEach((transaction) => {
      // 從 "YYYY年MM月DD日" 格式解析日期
      let date: string;
      try {
        const match = transaction.date.match(/(\d+)年(\d+)月(\d+)日/);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]) - 1; // JavaScript 月份從 0 開始
          const day = parseInt(match[3]);
          
          // Create date at noon to avoid timezone issues
          const txDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
          date = txDate.toISOString().split("T")[0];
        } else {
          // 如果不是 "YYYY年MM月DD日" 格式，嘗試直接解析
          const txDate = new Date(transaction.date);
          date = txDate.toISOString().split("T")[0];
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

    return {
      groupedTransactions: groupedByDate,
      groupedFixedTransactions: { expense: [], income: [] }
    };
  }, [transactions, activeTab]);

  // Simulate data processing delay with staggered loading
  useEffect(() => {
    if (!isLoading) {
      // Skip processing state if a transaction was clicked to prevent reload effect
      if (transactionClickedRef.current) {
        setIsProcessing(false);
        return;
      }
      
      // Use a shorter delay to ensure faster transition
      const timer = setTimeout(() => {
        setIsProcessing(false);
      }, 200); // Reduced from 300ms to 200ms
      return () => clearTimeout(timer);
    }
    setIsProcessing(true);
  }, [isLoading, transactions]);  // Remove activeTab dependency to prevent loading on tab change

  // Debug panel component
  const DebugPanel = () => {
    if (!isDebugMode) return null;
    
    return (
      <div className="bg-gray-100 p-3 mb-4 rounded-lg text-xs font-mono">
        <div className="font-bold mb-2">Debug Information:</div>
        <div>Active Tab: {activeTab}</div>
        <div>Is Loading: {isLoading ? 'Yes' : 'No'}</div>
        <div>Is Processing: {isProcessing ? 'Yes' : 'No'}</div>
        <div>Is Tab Switching: {isTabSwitching ? 'Yes' : 'No'}</div>
        <div>Is Collapsed: {isCollapsed ? 'Yes' : 'No'}</div>
        <div>Transaction Count: {transactions.length}</div>
        <div>Current Date: {currentDate.toISOString()}</div>
        {activeTab === "general" && (
          <div>Date Groups: {Object.keys(groupedTransactions).length}</div>
        )}
        {activeTab === "fixed" && (
          <>
            <div>Fixed Expenses: {groupedFixedTransactions.expense.length}</div>
            <div>Fixed Income: {groupedFixedTransactions.income.length}</div>
          </>
        )}
      </div>
    );
  };

  // Debug toggle button
  const DebugToggle = () => (
    <button
      onClick={handleToggleDebugMode}
      className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg z-50 flex items-center justify-center"
      aria-label={isDebugMode ? "Hide Debug Info" : "Show Debug Info"}
    >
      <Bug className="h-5 w-5" />
    </button>
  );

  // Render enhanced skeleton loaders during loading, but not during tab switching or transaction clicks
  if ((isLoading || isProcessing) && !isTabSwitching && !transactionClickedRef.current) {
    // Different skeleton layouts based on active tab
    if (activeTab === "fixed") {
      return (
        <>
          <DebugPanel />
          <div className="space-y-4 pb-4">
            {/* Expense skeleton */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <HeaderSkeleton />
              <div className="divide-y divide-gray-100">
                {[1, 2, 3].map((item) => (
                  <TransactionSkeleton key={`skeleton-expense-${item}`} />
                ))}
              </div>
            </div>
            
            {/* Income skeleton */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <HeaderSkeleton />
              <div className="divide-y divide-gray-100">
                {[1, 2].map((item) => (
                  <TransactionSkeleton key={`skeleton-income-${item}`} />
                ))}
              </div>
            </div>
          </div>
          <DebugToggle />
        </>
      );
    }
    
    // General tab skeleton
    return (
      <>
        <DebugPanel />
        <div className="space-y-4 pb-4">
          {/* Generate different numbers of skeletons for each group to make it look more natural */}
          {[
            { id: 1, items: 3 },
            { id: 2, items: 2 },
            { id: 3, items: 4 }
          ].map((group) => (
            <div 
              key={`skeleton-group-${group.id}`} 
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
              style={{ 
                ...fadeInAnimation,
                animationDelay: `${(group.id - 1) * 50}ms` // Reduced from 100ms to 50ms
              }}
            >
              <HeaderSkeleton />
              <div className="divide-y divide-gray-100">
                {Array.from({ length: group.items }).map((_, item) => (
                  <TransactionSkeleton key={`skeleton-item-${group.id}-${item}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <DebugToggle />
      </>
    );
  }

  // 固定支出/收入的顯示邏輯
  if (activeTab === "fixed") {
    const { expense, income } = groupedFixedTransactions;
    
    if (expense.length === 0 && income.length === 0) {
      return (
        <>
          <DebugPanel />
          <div className="text-center py-8 text-gray-500 animate-fadeIn">
            本月尚無固定記錄
          </div>
          <DebugToggle />
        </>
      );
    }
    
    return (
      <>
        <DebugPanel />
        <div className="space-y-4 pb-4">
          {/* 固定支出區塊 - Apply consistent animation style */}
          {expense.length > 0 && (
            <div 
              className="bg-white rounded-2xl shadow-sm overflow-hidden" 
              style={{ 
                ...fadeInAnimation,
                animationDelay: '30ms' // Reduced from 50ms to 30ms
              }}
            >
              <div className="flex justify-between items-center px-5 py-3 border-b">
                <div className="font-medium text-base text-gray-700">
                  固定支出
                </div>
                <div className="text-xs text-gray-500">
                  -${expense.reduce((sum, tx) => sum + Math.abs(tx.amount), 0).toFixed(2)}
                </div>
              </div>

              <div 
                className={`transition-all ${
                  isCollapsed 
                    ? 'duration-150 max-h-0 opacity-0 scale-y-95 origin-top' 
                    : 'duration-300 max-h-[2000px] opacity-100 scale-y-100'
                } overflow-hidden ease-in-out`}
                style={{
                  transitionDelay: isCollapsed ? '100ms' : '100ms' // Reduced from 200ms to 100ms
                }}
              >
                <div className="divide-y divide-gray-100">
                  {expense.map((transaction, index) => (
                    <TransactionItem 
                      key={`expense-${transaction.id}-${index}`}
                      transaction={transaction}
                      onTransactionClick={handleTransactionClick}
                      showDebugInfo={isDebugMode}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 固定收入區塊 - Apply consistent animation style */}
          {income.length > 0 && (
            <div 
              className="bg-white rounded-2xl shadow-sm overflow-hidden" 
              style={{ 
                ...fadeInAnimation,
                animationDelay: '80ms' // Reduced from 150ms to 80ms
              }}
            >
              <div className="flex justify-between items-center px-5 py-3 border-b">
                <div className="font-medium text-base text-gray-700">
                  固定收入
                </div>
                <div className="text-xs text-gray-500">
                  +${income.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)}
                </div>
              </div>

              <div 
                className={`transition-all ${
                  isCollapsed 
                    ? 'duration-150 max-h-0 opacity-0 scale-y-95 origin-top' 
                    : 'duration-300 max-h-[2000px] opacity-100 scale-y-100'
                } overflow-hidden ease-in-out`}
                style={{
                  transitionDelay: isCollapsed ? '0ms' : '50ms'
                }}
              >
                <div className="divide-y divide-gray-100">
                  {income.map((transaction, index) => (
                    <TransactionItem 
                      key={`income-${transaction.id}-${index}`}
                      transaction={transaction}
                      onTransactionClick={handleTransactionClick}
                      showDebugInfo={isDebugMode}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <DebugToggle />
      </>
    );
  }

  // 一般記錄的顯示邏輯（按日期分組）
  if (Object.keys(groupedTransactions).length === 0) {
    return (
      <>
        <DebugPanel />
        <div className="text-center py-8 text-gray-500 animate-fadeIn">
          本月尚無一般記錄
        </div>
        <DebugToggle />
      </>
    );
  }

  return (
    <>
      <DebugPanel />
      <div className="space-y-4 pb-4">
        {Object.entries(groupedTransactions)
          .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
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
                  animationDelay: `${groupIndex * 30}ms` // Reduced from 50ms to 30ms
                }}
              >
                <div className="flex justify-between items-center px-5 py-3 border-b">
                  <div className="font-medium text-base text-gray-700">
                    {formattedDate}
                  </div>
                  <div className="text-xs text-gray-500">
                    {/* 計算淨額（收入減去支出） */}
                    {(() => {
                      const netAmount = incomeTotal - expenseTotal;
                      const prefix = netAmount >= 0 ? "+" : "-";
                      return `${prefix}$${Math.abs(netAmount).toFixed(2)}`;
                    })()}
                  </div>
                </div>

                <div 
                  className={`transition-all ${
                    isCollapsed 
                      ? 'duration-150 max-h-0 opacity-0 scale-y-95 origin-top' 
                      : 'duration-300 max-h-[2000px] opacity-100 scale-y-100'
                  } overflow-hidden ease-in-out`}
                  style={{
                    transitionDelay: isCollapsed ? '0ms' : `${groupIndex * 20}ms` // Reduced from 30ms to 20ms
                  }}
                >
                  <div className="divide-y divide-gray-100">
                    {dayTransactions.map((transaction, index) => (
                      <TransactionItem 
                        key={`tx-${transaction.id}-${index}`}
                        transaction={transaction}
                        onTransactionClick={handleTransactionClick}
                        showDebugInfo={isDebugMode}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
      <DebugToggle />
    </>
  );
} 