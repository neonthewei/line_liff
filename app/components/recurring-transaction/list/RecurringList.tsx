"use client";

import { useEffect, useState } from "react";
import { ChevronRight, ArrowLeft, Plus, Check, X } from "lucide-react";
import { RecurringListProps } from "./types";
import { useRecurringTransactions } from "./hooks";
import { formatDate, formatRecurrence, calculateMonthlyAmount } from "./utils";
import { RecurringTransactionSkeleton, HeaderSkeleton } from "./Skeletons";
import { fadeInAnimation } from "../detail/constants";

export default function RecurringList({
  userId,
  onClose,
  onDataChanged,
  onSelect,
  onCreate,
}: RecurringListProps) {
  const { isLoading, error, groupedTransactions } =
    useRecurringTransactions(userId);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Calculate total monthly expenses and incomes
  const monthlyExpenses = groupedTransactions.expenses.reduce(
    (sum, tx) => sum + Math.abs(calculateMonthlyAmount(tx)),
    0
  );

  const monthlyIncomes = groupedTransactions.incomes.reduce(
    (sum, tx) => sum + calculateMonthlyAmount(tx),
    0
  );

  // 處理關閉管理器並通知數據變更
  const handleClose = () => {
    // 如果提供了 onDataChanged 回調，則調用它通知父組件數據已更改
    if (onDataChanged) {
      onDataChanged();
    }

    // 調用原始的 onClose 函數
    onClose();
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-100 z-50 overflow-y-auto">
        <div className="space-y-4 p-4 max-w-md mx-auto">
          {/* Expense skeleton */}
          <div
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
            style={{ ...fadeInAnimation, animationDelay: "0ms" }}
          >
            <HeaderSkeleton />
            <div className="divide-y divide-gray-100">
              {[1, 2, 3].map((item) => (
                <RecurringTransactionSkeleton
                  key={`skeleton-expense-${item}`}
                />
              ))}
            </div>
          </div>

          {/* Income skeleton */}
          <div
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
            style={{ ...fadeInAnimation, animationDelay: "0ms" }}
          >
            <HeaderSkeleton />
            <div className="divide-y divide-gray-100">
              {[1, 2].map((item) => (
                <RecurringTransactionSkeleton key={`skeleton-income-${item}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom buttons skeleton */}
        <div className="fixed bottom-0 left-0 right-0 pt-4 px-4 pb-6 bg-gray-100 z-30 before:content-[''] before:absolute before:left-0 before:right-0 before:top-[-20px] before:h-[20px] before:bg-gradient-to-t before:from-gray-100 before:to-transparent before:z-30">
          <div className="max-w-md mx-auto flex gap-3">
            <button
              onClick={handleClose}
              className="w-[30%] py-3 rounded-2xl bg-gray-200 text-gray-600 flex items-center justify-center transition-colors duration-150 active:bg-gray-300"
              aria-label="返回"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={onCreate}
              className="w-[70%] py-3 rounded-2xl bg-gray-200 text-gray-600 flex items-center justify-center transition-colors duration-150 active:bg-gray-300"
              aria-label="新增固定收支"
            >
              <Plus className="h-5 w-5 mr-1" />
              新增
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-100 z-50 overflow-y-auto">
        <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="text-red-500 mb-2">載入失敗</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl transition-colors active:bg-gray-300"
          >
            重新整理
          </button>
        </div>

        {/* Bottom buttons - back button only */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-100 z-30 before:content-[''] before:absolute before:left-0 before:right-0 before:top-[-20px] before:h-[20px] before:bg-gradient-to-t before:from-gray-100 before:to-transparent before:z-30">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-2xl bg-gray-200 text-gray-600 font-medium flex items-center justify-center transition-colors duration-150 active:bg-gray-300"
              aria-label="返回"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 overflow-y-auto">
      {/* Toast 通知 */}
      {showToast && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg ${
            toastType === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
          style={
            {
              // 移除動畫效果
            }
          }
        >
          <div className="flex items-center">
            {toastType === "success" ? (
              <Check className="mr-2 animate-pulse" size={18} />
            ) : (
              <X className="mr-2 animate-pulse" size={18} />
            )}
            <span className="animate-fadeIn">{toastMessage}</span>
          </div>
        </div>
      )}

      <div className="space-y-4 p-4 pb-24 max-w-md mx-auto">
        {/* Expenses section */}
        {groupedTransactions.expenses.length > 0 && (
          <div
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
            style={{ ...fadeInAnimation, animationDelay: "0ms" }}
          >
            <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-50">
              <div className="font-medium text-base text-gray-700">
                固定支出
              </div>
              <div className="text-xs text-gray-500">
                平均每月 -${Math.round(monthlyExpenses)}
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {groupedTransactions.expenses.map((transaction) => (
                <div
                  key={transaction.id}
                  onClick={() => onSelect(transaction)}
                  className="px-4 py-3 flex items-center justify-between cursor-pointer transition-colors duration-150 hover:bg-gray-50 active:bg-gray-100"
                  role="button"
                  tabIndex={0}
                  aria-label={`${transaction.memo} ${transaction.amount}`}
                >
                  <div className="flex items-center">
                    <div className="pl-1">
                      <div className="font-medium text-green-600">
                        {transaction.category || "未分類"}
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {transaction.memo ? `${transaction.memo} - ` : ""}
                        {formatRecurrence(
                          transaction.interval,
                          transaction.frequency
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        從 {formatDate(transaction.start_date)}
                        {transaction.end_date
                          ? ` 到 ${formatDate(transaction.end_date)}`
                          : " 開始"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-lg font-bold mr-2 text-gray-900">
                      -${Math.abs(transaction.amount)}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incomes section */}
        {groupedTransactions.incomes.length > 0 && (
          <div
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
            style={{ ...fadeInAnimation, animationDelay: "0ms" }}
          >
            <div className="flex justify-between items-center px-5 py-3 border-b bg-gray-50">
              <div className="font-medium text-base text-gray-700">
                固定收入
              </div>
              <div className="text-xs text-gray-500">
                平均每月 ${Math.round(monthlyIncomes)}
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {groupedTransactions.incomes.map((transaction) => (
                <div
                  key={transaction.id}
                  onClick={() => onSelect(transaction)}
                  className="px-4 py-3 flex items-center justify-between cursor-pointer transition-colors duration-150 hover:bg-gray-50 active:bg-gray-100"
                  role="button"
                  tabIndex={0}
                  aria-label={`${transaction.memo} ${transaction.amount}`}
                >
                  <div className="flex items-center">
                    <div className="pl-1">
                      <div className="font-medium text-blue-600">
                        {transaction.category || "未分類"}
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {transaction.memo ? `${transaction.memo} - ` : ""}
                        {formatRecurrence(
                          transaction.interval,
                          transaction.frequency
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        從 {formatDate(transaction.start_date)}
                        {transaction.end_date
                          ? ` 到 ${formatDate(transaction.end_date)}`
                          : " 開始"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-lg font-bold mr-2 text-gray-900">
                      ${Math.abs(transaction.amount)}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {groupedTransactions.expenses.length === 0 &&
          groupedTransactions.incomes.length === 0 && (
            <div
              className="flex flex-col items-center justify-center h-[50vh] px-4 text-center"
              style={{ ...fadeInAnimation, animationDelay: "0ms" }}
            >
              <div className="text-gray-400 mb-2 text-5xl">💸</div>
              <h3 className="text-lg font-medium text-gray-700">
                尚無固定收支
              </h3>
            </div>
          )}

        {/* Bottom buttons - back and add buttons side by side */}
        <div className="fixed bottom-0 left-0 right-0 pt-4 px-4 pb-6 bg-gray-100 z-30 before:content-[''] before:absolute before:left-0 before:right-0 before:top-[-20px] before:h-[20px] before:bg-gradient-to-t before:from-gray-100 before:to-transparent before:z-30">
          <div className="max-w-md mx-auto flex gap-3">
            <button
              onClick={handleClose}
              className="w-[30%] py-3 rounded-2xl bg-gray-200 text-gray-600 flex items-center justify-center transition-colors duration-150 active:bg-gray-300"
              aria-label="返回"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={onCreate}
              className="w-[70%] py-3 rounded-2xl bg-gray-200 text-gray-600 flex items-center justify-center transition-colors duration-150 active:bg-gray-300"
              aria-label="新增固定收支"
            >
              <Plus className="h-5 w-5 mr-1" />
              新增
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
