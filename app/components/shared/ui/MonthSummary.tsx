"use client";

import { useState, useEffect, useRef } from "react";
import { Skeleton } from "./skeleton";
import type { Transaction } from "@/types/transaction";
import { ChevronDown, ChevronUp } from "lucide-react";

interface AccountBook {
  id: string;
  name: string;
  summary: {
    totalExpense: number;
    totalIncome: number;
    balance: number;
  };
}

interface MonthSummaryProps {
  currentDate: Date;
  summary?: {
    totalExpense: number;
    totalIncome: number;
    balance: number;
  };
  isLoading?: boolean;
  onClick?: () => void;
  accountBooks?: AccountBook[];
  onAccountBookChange?: (accountBookId: string) => void;
  currentAccountBook?: string;
}

export default function MonthSummary({
  currentDate,
  summary = { totalExpense: 0, totalIncome: 0, balance: 0 },
  isLoading = false,
  onClick,
  accountBooks = [
    {
      id: "default",
      name: "帳目總覽",
      summary: { totalExpense: 0, totalIncome: 0, balance: 0 },
    },
  ],
  onAccountBookChange,
  currentAccountBook = "default",
}: MonthSummaryProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [localSummary, setLocalSummary] = useState(summary);
  const [expanded, setExpanded] = useState(false);
  const processedTransactionsRef = useRef<Set<string>>(new Set());
  const accountListRef = useRef<HTMLDivElement>(null);

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

  // 點擊外部時關閉展開的帳本列表
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      // 如果列表是展開的
      if (expanded && accountListRef.current) {
        // 檢查點擊是否在列表之外
        const isClickInsideList = accountListRef.current.contains(
          event.target as Node
        );

        // 如果點擊在列表之外，則關閉列表
        if (!isClickInsideList) {
          // 獲取卡片元素
          const cardElement = document.querySelector(".card-container");
          // 檢查點擊是否在卡片之外
          if (cardElement && !cardElement.contains(event.target as Node)) {
            setExpanded(false);
          }
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [expanded]);

  const handleClick = () => {
    if (onClick) onClick();
    // 如果只有一個帳本，點擊不應該顯示列表
    if (accountBooks.length > 1) {
      setExpanded(!expanded);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (onClick) onClick();
      // 如果只有一個帳本，按鍵也不應該顯示列表
      if (accountBooks.length > 1) {
        setExpanded(!expanded);
      }
    }
  };

  const handleMouseDown = () => {
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleAccountBookSelect = (
    accountBookId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (onAccountBookChange) {
      onAccountBookChange(accountBookId);
    }
    setExpanded(false);
  };

  // 獲取當前選中的帳本
  const currentBook =
    accountBooks.find((book) => book.id === currentAccountBook) ||
    accountBooks[0];

  return (
    <div className="relative mb-4">
      <div
        className={`card-container bg-green-500 text-white rounded-2xl overflow-hidden shadow-sm 
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
        aria-expanded={expanded}
      >
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <div className="text-sm font-medium">月結餘</div>
            {!isLoading && (
              <div className="text-xs opacity-80 flex items-center bg-white/20 py-0.5 px-2 rounded-full">
                {accountBooks.length > 1 ? (
                  <>
                    {currentBook.name}
                    {expanded ? (
                      <ChevronUp size={14} className="ml-1" />
                    ) : (
                      <ChevronDown size={14} className="ml-1" />
                    )}
                  </>
                ) : (
                  <>
                    {currentDate.getFullYear()}年
                    {(currentDate.getMonth() + 1).toString().padStart(2, "0")}月
                  </>
                )}
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
                ${currentBook.summary.balance}
              </div>

              <div className="flex justify-between text-sm">
                <div className="flex flex-col">
                  <span className="text-xs opacity-80 mb-0.5">月支出</span>
                  <span className="font-medium">
                    ${currentBook.summary.totalExpense}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs opacity-80 mb-0.5">月收入</span>
                  <span className="font-medium">
                    ${currentBook.summary.totalIncome}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 展開的帳本列表 */}
      {expanded && accountBooks.length > 1 && (
        <div
          ref={accountListRef}
          className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg overflow-hidden"
          style={{ maxHeight: "300px" }}
        >
          <div className="max-h-60 overflow-y-auto">
            {accountBooks.map((book) => (
              <div
                key={book.id}
                className={`px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors
                  ${book.id === currentAccountBook ? "bg-green-50" : ""}
                `}
                onClick={(e) => handleAccountBookSelect(book.id, e)}
              >
                <div className="flex items-center">
                  <div className="font-medium text-gray-800">{book.name}</div>
                  {book.id === currentAccountBook && (
                    <div className="ml-2 bg-green-500 w-2 h-2 rounded-full"></div>
                  )}
                </div>
                <div className="text-gray-600 font-medium">
                  ${book.summary.balance}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
