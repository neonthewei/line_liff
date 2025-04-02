"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import type { Transaction } from "@/types/transaction";
import RecurringTransactionManager from "../../recurring-transaction";
import TransactionDetail from "../detail/index";
import {
  useScrollLock,
  useSwipeState,
  useDeleteTransaction,
  useDebugMode,
} from "./hooks";
import {
  filterTransactions,
  groupTransactionsByDate,
  calculateDateGroupTotals,
  formatLocalDate,
} from "./utils";
import { TransactionItem } from "./TransactionItem";
import { TransactionSkeleton, HeaderSkeleton } from "./Skeletons";
import { DebugPanel } from "./DebugPanel";
import { TransactionListProps } from "./types";

// Define a consistent animation style for all content blocks
const fadeInAnimation = {
  // 移除动画效果，让元素直接显示
  animation: "none",
};

export default function TransactionList({
  transactions,
  currentDate,
  activeTab,
  isLoading = false,
  onTransactionClick,
  showDebugInfo = false,
  userId,
  onTransactionUpdate,
}: TransactionListProps) {
  const prevTabRef = useRef(activeTab);
  const isTabSwitching = prevTabRef.current !== activeTab;
  const [animationKey, setAnimationKey] = useState(0);
  const [showRecurringManager, setShowRecurringManager] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  // 使用自定义钩子
  useScrollLock();
  const { activeSwipeId, handleSwipeStateChange, shouldCloseItem } =
    useSwipeState();
  const {
    deletedTransactionIds,
    dateGroupsAnimatingOut,
    handleDeleteTransaction,
  } = useDeleteTransaction(transactions, activeTab, onTransactionUpdate);
  const {
    isDebugMode,
    setIsDebugMode,
    showAllTimestamps,
    isDebugCollapsed,
    setIsDebugCollapsed,
    handleToggleDebugMode,
  } = useDebugMode(showDebugInfo);

  // 处理刷新定期交易数据
  const handleRecurringDataChanged = () => {
    console.log("定期交易数据已更改，通知父组件重新加载数据");
    if (onTransactionUpdate) {
      // 通知父组件重新获取数据 (直接使用传入的交易数据，保持筛选状态)
      onTransactionUpdate(transactions);
    }
  };

  // 更新 isDebugMode 当 showDebugInfo 变化
  useEffect(() => {
    setIsDebugMode(showDebugInfo);
  }, [showDebugInfo, setIsDebugMode]);

  // 更新前一个标签引用
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      // Tab is changing, trigger animation reset
      setAnimationKey((prev) => prev + 1);

      // Set a small delay before updating the previous tab reference
      const timer = setTimeout(() => {
        prevTabRef.current = activeTab;
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // 处理交易点击
  const handleTransactionClick = (id: string) => {
    const transaction = transactions.find((t) => t.id === id);
    if (transaction) {
      setSelectedTransaction(transaction);
    }
  };

  // 处理关闭详情视图
  const handleCloseDetail = () => {
    setSelectedTransaction(null);
  };

  // Memoized transaction processing
  const { groupedTransactions } = useMemo(() => {
    if (transactions.length === 0) {
      return { groupedTransactions: {} };
    }

    // 根据选定的标签过滤数据 - 同时排除已删除的交易
    const filteredData = filterTransactions(
      transactions,
      activeTab,
      deletedTransactionIds
    );

    // 按日期分组交易
    const groupedByDate = groupTransactionsByDate(filteredData);

    return { groupedTransactions: groupedByDate };
  }, [transactions, activeTab, deletedTransactionIds]);

  // 渲染加载骨架
  if (isLoading && !isTabSwitching) {
    return (
      <>
        <DebugPanel
          isDebugMode={isDebugMode}
          isDebugCollapsed={isDebugCollapsed}
          setIsDebugCollapsed={setIsDebugCollapsed}
          activeTab={activeTab}
          isLoading={isLoading}
          isTabSwitching={isTabSwitching}
          transactionsCount={transactions.length}
          currentDate={currentDate}
          displayTransactionsCount={0}
        />
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

  // 检查是否有交易记录
  if (Object.keys(groupedTransactions).length === 0) {
    return (
      <>
        <DebugPanel
          isDebugMode={isDebugMode}
          isDebugCollapsed={isDebugCollapsed}
          setIsDebugCollapsed={setIsDebugCollapsed}
          activeTab={activeTab}
          isLoading={isLoading}
          isTabSwitching={isTabSwitching}
          transactionsCount={transactions.length}
          currentDate={currentDate}
          displayTransactionsCount={0}
        />
        <div className="text-center py-8 text-gray-500 animate-fadeIn">
          {activeTab === "general" ? "本月尚無一般記錄" : "本月尚無定期記錄"}
        </div>
        {activeTab === "fixed" && (
          <div className="fixed bottom-0 left-0 right-0 pt-4 px-4 pb-6 bg-gray-100 z-30 before:content-[''] before:absolute before:left-0 before:right-0 before:top-[-20px] before:h-[20px] before:bg-gradient-to-t before:from-gray-100 before:to-transparent before:z-30">
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
            onDataChanged={handleRecurringDataChanged}
          />
        )}
      </>
    );
  }

  // 主要渲染
  return (
    <>
      <DebugPanel
        isDebugMode={isDebugMode}
        isDebugCollapsed={isDebugCollapsed}
        setIsDebugCollapsed={setIsDebugCollapsed}
        activeTab={activeTab}
        isLoading={isLoading}
        isTabSwitching={isTabSwitching}
        transactionsCount={transactions.length}
        currentDate={currentDate}
        displayTransactionsCount={
          Object.values(groupedTransactions).flat().length
        }
      />
      <div className={`space-y-4 ${activeTab === "fixed" ? "pb-24" : "pb-4"}`}>
        {Object.entries(groupedTransactions)
          .sort(
            ([dateA], [dateB]) =>
              new Date(dateB).getTime() - new Date(dateA).getTime()
          )
          .map(([date, dayTransactions], groupIndex) => {
            // 计算当天的支出和收入总额
            const { expenseTotal, incomeTotal } =
              calculateDateGroupTotals(dayTransactions);
            const formattedDate = formatLocalDate(date);

            // 检查此日期组是否正在动画中
            const isAnimatingOut = dateGroupsAnimatingOut.has(date);

            // 添加动画样式，使用与交易项目相同的动画时间和曲线
            const dateGroupAnimationStyle = isAnimatingOut
              ? {
                  opacity: 0,
                  maxHeight: "0px",
                  marginTop: "0px",
                  marginBottom: "0px",
                  paddingTop: "0px",
                  paddingBottom: "0px",
                  overflow: "hidden",
                  transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
                }
              : {
                  opacity: 1,
                  maxHeight: "1000px",
                  transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
                };

            return (
              <div
                key={`date-${date}`}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
                style={{
                  ...fadeInAnimation,
                  ...dateGroupAnimationStyle,
                  animationDelay: "0ms",
                }}
              >
                <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-50">
                  <div className="font-medium text-base text-gray-700">
                    {formattedDate}
                  </div>
                  <div className="text-xs text-gray-500">
                    {/* 计算净额（收入减去支出） */}
                    {(() => {
                      const netAmount = incomeTotal - expenseTotal;
                      const prefix = netAmount >= 0 ? "+" : "-";
                      return `${prefix}$${Math.abs(netAmount)}`;
                    })()}
                  </div>
                </div>

                <div className="block overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {dayTransactions.map((transaction, index) => (
                      <TransactionItem
                        key={`tx-${transaction.id}-${index}`}
                        transaction={transaction}
                        onTransactionClick={handleTransactionClick}
                        showDebugInfo={isDebugMode}
                        showTimestamp={showAllTimestamps}
                        onDelete={(id) => {
                          // 直接触发删除处理
                          handleDeleteTransaction(id);
                        }}
                        onSwipeStateChange={(isOpen) =>
                          handleSwipeStateChange(isOpen, transaction.id)
                        }
                        shouldClose={shouldCloseItem(transaction.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

        {/* 管理定期收支按钮 - 只在定期标签显示 */}
        {activeTab === "fixed" && (
          <div className="fixed bottom-0 left-0 right-0 pt-4 px-4 pb-6 bg-gray-100 z-30 before:content-[''] before:absolute before:left-0 before:right-0 before:top-[-20px] before:h-[20px] before:bg-gradient-to-t before:from-gray-100 before:to-transparent before:z-30">
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
          onDataChanged={handleRecurringDataChanged}
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
              // 先关闭详情页，再更新数据，避免闪烁
              handleCloseDetail();

              // 延迟更新数据，等待关闭动画完成
              setTimeout(() => {
                if (onTransactionUpdate) {
                  // 更新本地的交易记录
                  const updatedTransactions = transactions.map((t) =>
                    t.id === updatedTransaction.id ? updatedTransaction : t
                  );

                  // 触发父组件重新获取数据
                  onTransactionUpdate(updatedTransactions);
                }
              }, 50);
            }}
            onDelete={() => {
              // 先关闭详情页，再更新数据，避免闪烁
              handleCloseDetail();

              // 延迟更新数据，等待关闭动画完成
              setTimeout(() => {
                if (onTransactionUpdate) {
                  const updatedTransactions = transactions.filter(
                    (t) => t.id !== selectedTransaction.id
                  );
                  onTransactionUpdate(updatedTransactions);
                }
              }, 50);
            }}
          />
        </div>
      )}
    </>
  );
}
