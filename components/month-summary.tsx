"use client";

import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Transaction } from "@/types/transaction";

interface MonthSummaryProps {
  currentDate: Date;
  summary?: {
    totalExpense: number;
    totalIncome: number;
    balance: number;
  };
  isLoading?: boolean;
  onClick?: () => void;
}

export default function MonthSummary({
  currentDate,
  summary = { totalExpense: 0, totalIncome: 0, balance: 0 },
  isLoading = false,
  onClick,
}: MonthSummaryProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [localSummary, setLocalSummary] = useState(summary);
  const processedTransactionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLocalSummary(summary);
    processedTransactionsRef.current.clear();
  }, [summary]);

  useEffect(() => {
    const handleTransactionDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("[月度摘要] 收到事件:", customEvent.type);

      if (!customEvent.detail) {
        console.error("[月度摘要] 事件没有detail属性");
        return;
      }

      const { deletedTransaction } = customEvent.detail;
      console.log("[月度摘要] 收到交易删除事件:", deletedTransaction);

      if (!deletedTransaction) {
        console.error("[月度摘要] 删除事件中没有交易数据");
        return;
      }

      if (processedTransactionsRef.current.has(deletedTransaction.id)) {
        console.log(
          `[月度摘要] 交易 ${deletedTransaction.id} 已经处理过，跳过重复更新`
        );
        return;
      }

      try {
        const type = deletedTransaction.type;
        const amount = Number(deletedTransaction.amount);

        console.log(`[月度摘要] 交易类型:${type}, 金额:${amount}`);

        if (isNaN(amount)) {
          console.error("[月度摘要] 交易金额无效:", deletedTransaction.amount);
          return;
        }

        processedTransactionsRef.current.add(deletedTransaction.id);

        setLocalSummary((prev) => {
          let newSummary;

          if (type === "expense") {
            newSummary = {
              ...prev,
              totalExpense: prev.totalExpense - Math.abs(amount),
              balance: prev.balance + Math.abs(amount),
            };
          } else if (type === "income") {
            newSummary = {
              ...prev,
              totalIncome: prev.totalIncome - Math.abs(amount),
              balance: prev.balance - Math.abs(amount),
            };
          } else {
            console.error("[月度摘要] 未知交易类型:", type);
            return prev;
          }

          console.log("[月度摘要] 更新前:", prev);
          console.log("[月度摘要] 更新后:", newSummary);

          return newSummary;
        });

        console.log("[月度摘要] 已更新摘要数据");
      } catch (error) {
        console.error("[月度摘要] 处理删除事件时出错:", error);
      }
    };

    document.removeEventListener(
      "transaction-deleted",
      handleTransactionDeleted as EventListener
    );
    document.addEventListener(
      "transaction-deleted",
      handleTransactionDeleted as EventListener
    );

    console.log("[月度摘要] 已添加交易删除事件监听器");

    return () => {
      document.removeEventListener(
        "transaction-deleted",
        handleTransactionDeleted as EventListener
      );
      console.log("[月度摘要] 已移除交易删除事件监听器");
    };
  }, []);

  const handleClick = () => {
    if (onClick) onClick();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (onClick) onClick();
    }
  };

  const handleMouseDown = () => {
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  return (
    <div
      className={`mb-4 bg-green-500 text-white rounded-2xl overflow-hidden shadow-sm 
        transition-all duration-100 ease-in-out
        ${
          !isLoading
            ? "cursor-pointer active:brightness-95 active:scale-[0.98]"
            : ""
        }
        ${isPressed ? "brightness-95 scale-[0.99]" : ""}
      `}
      onClick={!isLoading ? handleClick : undefined}
      onKeyDown={!isLoading ? handleKeyDown : undefined}
      onMouseDown={!isLoading ? handleMouseDown : undefined}
      onMouseUp={!isLoading ? handleMouseUp : undefined}
      onMouseLeave={isPressed ? handleMouseUp : undefined}
      role={!isLoading ? "button" : undefined}
      tabIndex={!isLoading ? 0 : undefined}
      aria-label={
        !isLoading
          ? `${currentDate.getFullYear()}年${(currentDate.getMonth() + 1)
              .toString()
              .padStart(2, "0")}月的財務摘要`
          : undefined
      }
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div className="text-sm font-medium">月結餘</div>
          {!isLoading && (
            <div className="text-xs opacity-80">
              {currentDate.getFullYear()}年
              {(currentDate.getMonth() + 1).toString().padStart(2, "0")}月
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="h-[94px] flex flex-col justify-between">
            <div className="mb-4">
              <Skeleton className="h-10 w-40 bg-white/30" />
            </div>
            <div className="flex justify-between">
              <div className="flex flex-col">
                <Skeleton className="h-3 w-12 mb-1 bg-white/30" />
                <Skeleton className="h-5 w-20 bg-white/30" />
              </div>
              <div className="flex flex-col">
                <Skeleton className="h-3 w-12 mb-1 bg-white/30" />
                <Skeleton className="h-5 w-20 bg-white/30" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="text-4xl font-bold mb-4">
              ${localSummary.balance}
            </div>

            <div className="flex justify-between text-sm">
              <div className="flex flex-col">
                <span className="text-xs opacity-80 mb-0.5">月支出</span>
                <span className="font-medium">
                  ${localSummary.totalExpense}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs opacity-80 mb-0.5">月收入</span>
                <span className="font-medium">${localSummary.totalIncome}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
