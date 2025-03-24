"use client";

import { useEffect, useState, useMemo, memo, useRef } from "react";
import { ChevronRight, Bug, Trash2 } from "lucide-react";
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
    onSwipeStateChange,
    shouldClose,
  }: {
    transaction: Transaction;
    onTransactionClick: (id: string, type: string) => void;
    showDebugInfo?: boolean;
    showTimestamp?: boolean;
    onDelete?: (id: string) => void;
    onSwipeStateChange: (isOpen: boolean) => void;
    shouldClose: boolean;
  }) => {
    // Add refs to track touch position for distinguishing between scrolls and taps
    const touchStartRef = useRef<{
      x: number;
      y: number;
      time?: number;
      lastX?: number;
    } | null>(null);
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
    const isHorizontalSwipe = useRef(false); // 記錄是否為水平滑動
    const [isAnimating, setIsAnimating] = useState(false); // 控制滑動動畫狀態

    // 監聽外部請求關閉的信號
    useEffect(() => {
      if (shouldClose && showDeleteButton && !isDeleting) {
        // 如果收到關閉信號且項目正在顯示刪除按鈕，則自動收回
        setTranslateX(0);
        setShowDeleteButton(false);

        // 如果有引用，使用動畫
        if (itemRef.current) {
          itemRef.current.style.transition = "transform 0.2s ease-out";
          itemRef.current.style.transform = "translateX(0)";
        }
      }
    }, [shouldClose, isDeleting]);

    // 當刪除按鈕狀態變化時，通知父組件
    useEffect(() => {
      onSwipeStateChange(showDeleteButton);
    }, [showDeleteButton, onSwipeStateChange]);

    // 在滑動開始時添加禁止滾動事件
    useEffect(() => {
      // 在捕獲階段禁止滾動的處理函數
      const preventScroll = (e: TouchEvent) => {
        if (isHorizontalSwipe.current || showDeleteButton) {
          e.preventDefault();
        }
      };

      // 使用 passive: false 和 capture: true 確保能在冒泡前捕獲並阻止事件
      document.addEventListener("touchmove", preventScroll, {
        passive: false,
        capture: true,
      });

      return () => {
        document.removeEventListener("touchmove", preventScroll, {
          capture: true,
        });
      };
    }, [showDeleteButton]);

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
      // 如果是滑動狀態或者剛剛完成滑動，不觸發點擊事件
      if (isDragging || showDeleteButton || translateX > 10) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Call the click handler with a small delay to prevent UI flicker
      setTimeout(() => {
        onTransactionClick(transaction.id, transaction.type);
      }, 10);
    };

    // Handle touch move - update position
    const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return; // 如果還沒開始，不處理移動

      // 對於正在進行的動畫，我們允許打斷
      if (isAnimating) {
        // 停止當前動畫
        setIsAnimating(false);
        if (itemRef.current) {
          // 立即應用當前位置，不等動畫完成
          const currentTransform = window.getComputedStyle(
            itemRef.current
          ).transform;
          itemRef.current.style.transition = "none";
          // 如果已經有transform，保留它；如果沒有，使用當前的translateX
          if (currentTransform && currentTransform !== "none") {
            itemRef.current.style.transform = currentTransform;
          } else {
            itemRef.current.style.transform = `translateX(${translateX}px)`;
          }
        }
      }

      // 標記已經進行了移動
      isTouchMoveRef.current = true;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      // 計算滑動速度（為之後使用）
      const now = Date.now();
      const velocity = deltaX / (now - (touchStartRef.current.time || now));
      touchStartRef.current.time = now;
      touchStartRef.current.lastX = translateX; // 記錄上一個位置

      // 如果水平滑動已經開始或者顯示刪除按鈕，完全阻止頁面滾動
      if (Math.abs(deltaX) > 5 || showDeleteButton) {
        e.preventDefault(); // 阻止默認滾動行為
        e.stopPropagation(); // 阻止事件冒泡

        // 標記為水平滑動並鎖定頁面滾動
        isHorizontalSwipe.current = true;
        document.body.style.overflow = "hidden";
      }

      // 如果垂直移動超過閾值，且水平移動不明顯，取消滑動
      if (deltaY > 20 && Math.abs(deltaX) < 10) {
        setIsDragging(false);
        setTranslateX((prevX) => (prevX > 0 ? prevX : 0));
        // 如果不是水平滑動，恢復頁面滾動
        isHorizontalSwipe.current = false;
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
      } else {
        // 正常的向右滑動，限制範圍 0 到 deleteThreshold
        const newTranslateX = Math.max(0, Math.min(deleteThreshold, deltaX));
        setTranslateX(newTranslateX);
      }
    };

    // Handle touch start - record starting position
    const handleTouchStart = (e: React.TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(), // 記錄開始時間，用於計算速度
      };
      isTouchMoveRef.current = false;
      isHorizontalSwipe.current = false; // 重置水平滑動狀態
      setIsPressed(true);
      setIsDragging(true);

      // 如果已顯示刪除按鈕，則阻止默認行為
      if (showDeleteButton) {
        e.preventDefault();
        e.stopPropagation();
        // 立即鎖定頁面滾動
        document.body.style.overflow = "hidden";
      }

      // 如果正在動畫，立即停止
      if (isAnimating && itemRef.current) {
        setIsAnimating(false);
        itemRef.current.style.transition = "none";
      }
    };

    // Handle touch end - stop at threshold to show delete button or return to original position
    const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartRef.current) {
        setIsDragging(false);
        return;
      }

      // 恢復頁面滾動
      document.body.style.overflow = "";

      // 重置水平滑動標記
      isHorizontalSwipe.current = false;

      // 計算最終滑動速度
      const endTime = Date.now();
      const duration = endTime - (touchStartRef.current.time || endTime);
      const distance = translateX - (touchStartRef.current.lastX || 0);
      const velocity = (distance / Math.max(1, duration)) * 1000; // 每秒多少像素

      // 檢查是否進行了明顯的滑動
      const isSignificantMovement = translateX > 10;

      // 如果沒有明顯滑動，而且沒有移動過，可能是點擊
      if (!isSignificantMovement && !isTouchMoveRef.current) {
        setIsPressed(true);
        setTimeout(() => {
          onTransactionClick(transaction.id, transaction.type);
          setIsPressed(false);
        }, 150);
      } else {
        // 標記開始動畫
        setIsAnimating(true);

        // 修改閾值：當滑動超過 1/4 就彈出，當滑動小於 3/4 就彈回
        const quarterThreshold = deleteThreshold / 4;
        const threeQuarterThreshold = deleteThreshold * 0.75;

        // 決定最終位置 - 使用新的閾值邏輯和速度判斷
        let targetX = 0;

        // 考慮滑動速度 - 快速滑動可以更容易觸發動作
        const isQuickSwipe = Math.abs(velocity) > 800; // 每秒800像素以上視為快速滑動

        if (showDeleteButton) {
          // 已經顯示刪除按鈕的情況
          if (isQuickSwipe && velocity < -300) {
            // 快速向左滑動，直接關閉
            targetX = 0;
          } else if (isQuickSwipe && velocity > 300) {
            // 快速向右滑動，保持開啟
            targetX = deleteThreshold;
          } else {
            // 正常速度，依據位置判斷
            targetX = translateX < threeQuarterThreshold ? 0 : deleteThreshold;
          }
        } else {
          // 常規狀態
          if (isQuickSwipe && velocity > 300) {
            // 快速向右滑動，直接打開
            targetX = deleteThreshold;
          } else if (isQuickSwipe && velocity < -300) {
            // 快速向左滑動，保持關閉
            targetX = 0;
          } else {
            // 正常速度，依據位置判斷
            targetX = translateX > quarterThreshold ? deleteThreshold : 0;
          }
        }

        const shouldShowDelete = targetX > 0;

        // 決定動畫時間 - 根據距離調整
        const distanceToTarget = Math.abs(translateX - targetX);
        const animationDuration = Math.min(
          0.3,
          Math.max(0.15, distanceToTarget / 500)
        );

        // 如果需要回彈或者完全展開，使用動畫
        if (translateX !== targetX) {
          // 使用CSS過渡動畫平滑過渡到目標位置
          if (itemRef.current) {
            itemRef.current.style.transition = `transform ${animationDuration}s cubic-bezier(0.1, 0.9, 0.2, 1)`;
            itemRef.current.style.transform = `translateX(${targetX}px)`;

            // 在動畫結束後更新狀態
            setTimeout(() => {
              setTranslateX(targetX);
              setShowDeleteButton(shouldShowDelete);
              setIsAnimating(false); // 動畫完成

              // 重置transition，以便下次直接滑動時不會有動畫
              if (itemRef.current) {
                itemRef.current.style.transition = isDragging
                  ? "none"
                  : "transform 0.2s ease-out";
              }
            }, animationDuration * 1000); // 轉換為毫秒
          }
        } else {
          // 已經在目標位置，直接更新狀態
          setShowDeleteButton(shouldShowDelete);
          setIsAnimating(false);
        }

        // 防止觸發點擊事件
        e.preventDefault();
        e.stopPropagation();
      }

      // 添加一個小延遲再重置狀態，確保不會意外觸發點擊
      setTimeout(() => {
        setIsDragging(false);
        touchStartRef.current = null;
        isTouchMoveRef.current = false;
        setIsPressed(false);
      }, 50);
    };

    // Handle touch cancel - reset state
    const handleTouchCancel = () => {
      // 恢復頁面滾動
      document.body.style.overflow = "";
      isHorizontalSwipe.current = false;
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

      // 立即給用戶視覺反饋
      setIsDeleting(true);
      setTranslateX(0); // 開始收回刪除按鈕

      try {
        // 顯示即時收回動畫後再呼叫 API
        setTimeout(async () => {
          // 調用 API 刪除交易記錄
          const success = await deleteTransactionApi(
            transaction.id,
            transaction.type
          );

          if (success) {
            // 觸發刪除動畫
            setIsAnimatingOut(true);

            // 通知父組件此交易已被刪除，這樣可以立即更新列表
            if (onDelete) {
              onDelete(transaction.id);
            }

            // 等待動畫完成後才真正移除元素
            setTimeout(() => {
              setIsDeleted(true);
            }, 250); // 減少為 250ms 以加快動畫
          } else {
            // 如果失敗，重置 translateX
            setTranslateX(0);
            setShowDeleteButton(false);
            console.error("刪除交易失敗");
          }
          setIsDeleting(false);
        }, 50); // 輕微延遲，先讓視覺效果先行
      } catch (error) {
        console.error("刪除交易時發生錯誤:", error);
        setTranslateX(0);
        setShowDeleteButton(false);
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
          transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)", // 使用更快的動畫時間和更自然的貝塞爾曲線
        }
      : {
          opacity: 1,
          maxHeight: "200px", // 足夠大的高度
          transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
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
          {isDeleting ? (
            <span className="text-white text-sm">刪除中...</span>
          ) : (
            <Trash2 className="h-6 w-6 text-white" />
          )}
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
  const [deletedTransactionIds, setDeletedTransactionIds] = useState<
    Set<string>
  >(new Set()); // 記錄已刪除的交易ID

  // 添加一個引用來追踪當前滑出的交易項目ID
  const currentSwipedItemIdRef = useRef<string | null>(null);

  // 簡化處理交易刪除邏輯 - 改為記錄已刪除的交易ID
  const handleDeleteTransaction = async (id: string) => {
    // 將已刪除的交易ID添加到集合中
    setDeletedTransactionIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  };

  // 處理交易項目滑動狀態變化
  const handleSwipeStateChange = (transactionId: string, isOpen: boolean) => {
    if (isOpen) {
      // 如果有新項目滑出，設置為當前滑出項目
      currentSwipedItemIdRef.current = transactionId;
    } else if (currentSwipedItemIdRef.current === transactionId) {
      // 如果當前滑出項目被收回，清除引用
      currentSwipedItemIdRef.current = null;
    }
  };

  // 檢查是否應該收回指定項目（當其他項目被滑出時）
  const shouldCloseItem = (transactionId: string): boolean => {
    return (
      currentSwipedItemIdRef.current !== null &&
      currentSwipedItemIdRef.current !== transactionId
    );
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

    // 根據選定的標籤過濾數據 - 同時排除已刪除的交易
    const filteredData = transactions.filter(
      (transaction) =>
        (activeTab === "general"
          ? !transaction.isFixed
          : transaction.isFixed) && !deletedTransactionIds.has(transaction.id) // 過濾掉已刪除的交易
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
  }, [transactions, activeTab, deletedTransactionIds]); // 添加 deletedTransactionIds 作為依賴

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
                        onSwipeStateChange={(isOpen) =>
                          handleSwipeStateChange(transaction.id, isOpen)
                        }
                        shouldClose={shouldCloseItem(transaction.id)}
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
