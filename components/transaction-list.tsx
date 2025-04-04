"use client";

// 在文件开头添加声明合并，为window对象添加新方法
declare global {
  interface Window {
    lockBodyScroll?: () => void;
    unlockBodyScroll?: () => void;
  }
}

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
  onTransactionClick: (id: string) => void;
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
    onTransactionClick: (id: string) => void;
    showDebugInfo?: boolean;
    showTimestamp?: boolean;
    onDelete?: (id: string) => void;
    onSwipeStateChange: (isOpen: boolean, id: string) => void;
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
    const [showDeleteModal, setShowDeleteModal] = useState(false); // 新增刪除確認彈窗狀態
    const itemRef = useRef<HTMLDivElement>(null);
    const deleteThreshold = 100; // 刪除閾值
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false); // 新增狀態來控制項目是否已被刪除
    const [isAnimatingOut, setIsAnimatingOut] = useState(false); // 控制刪除動畫
    const contentRef = useRef<HTMLDivElement>(null); // 內容區域參考
    const isHorizontalSwipe = useRef(false);
    const isVerticalScroll = useRef(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isShowingDeleteConfirm, setIsShowingDeleteConfirm] = useState(false);

    // 優化收回動畫
    useEffect(() => {
      // 如果需要關閉且顯示刪除按鈕或已經有位移
      if (shouldClose && (showDeleteButton || translateX < 0)) {
        // console.log(`[回弹功能] 检测到shouldClose为true，正在收回交易项: ${transaction.id}`);

        // 立即中斷任何進行中的動畫
        if (itemRef.current) {
          // 先設置為非常短的過渡動畫，確保立即性
          itemRef.current.style.transition =
            "transform 0.08s cubic-bezier(0.2, 0, 0.4, 1)";
          itemRef.current.style.transform = "translateX(0)";

          // console.log(`[回弹功能] 开始快速收回动画，交易ID: ${transaction.id}`);
        }

        // 立即更新狀態
        setTranslateX(0);
        setShowDeleteButton(false);

        // 設置動畫狀態，防止在動畫期間進行其他操作
        setIsAnimating(true);

        // 動畫結束後重置動畫狀態
        setTimeout(() => {
          setIsAnimating(false);
          // console.log(`[回弹功能] 收回动画完成，交易ID: ${transaction.id}`);
        }, 80); // 和過渡時間匹配
      }
    }, [shouldClose, showDeleteButton, translateX, transaction.id]);

    // 當刪除按鈕狀態變化時，通知父組件
    useEffect(() => {
      onSwipeStateChange(showDeleteButton, transaction.id);
    }, [showDeleteButton, onSwipeStateChange, transaction.id]);

    // 修改常见滚动管理效果
    useEffect(() => {
      // 更简化的滚动锁定/解锁函数，避免页面跳动
      window.lockBodyScroll = () => {
        // 不再保存滚动位置，只添加类来控制滚动行为
        document.documentElement.classList.add("no-elastic-scroll");
        document.body.classList.add("no-elastic-scroll");

        // 添加针对LIFF环境的处理
        // 查找并锁定所有可能的LIFF容器元素
        const possibleContainers = [
          document.getElementById("__next"),
          document.getElementById("root"),
          document.querySelector(".liff-wrapper"),
          document.querySelector(".liff-container"),
          document.querySelector(".line-container"),
          ...Array.from(document.querySelectorAll('[id^="liff"]')),
          ...Array.from(document.querySelectorAll('[class^="liff"]')),
          ...Array.from(document.querySelectorAll("body > div")), // 常见的外层容器
          ...Array.from(document.querySelectorAll("body > div > div")), // 嵌套容器
        ].filter(Boolean); // 过滤null值

        // 为所有找到的容器添加类
        possibleContainers.forEach((container) => {
          if (container) {
            container.classList.add("no-elastic-scroll");
          }
        });

        // 直接设置body的touch-action和overflow属性
        document.body.style.setProperty("touch-action", "pan-x", "important");
        document.body.style.setProperty("overflow-y", "hidden", "important");
        document.body.style.setProperty(
          "overscroll-behavior",
          "none",
          "important"
        );

        // 添加阻止触摸移动事件的处理函数
        document.addEventListener("touchmove", preventVerticalScroll, {
          passive: false,
        });
      };

      window.unlockBodyScroll = () => {
        // 移除类，恢复滚动功能
        document.documentElement.classList.remove("no-elastic-scroll");
        document.body.classList.remove("no-elastic-scroll");

        // 移除针对LIFF环境的处理
        const possibleContainers = [
          document.getElementById("__next"),
          document.getElementById("root"),
          document.querySelector(".liff-wrapper"),
          document.querySelector(".liff-container"),
          document.querySelector(".line-container"),
          ...Array.from(document.querySelectorAll('[id^="liff"]')),
          ...Array.from(document.querySelectorAll('[class^="liff"]')),
          ...Array.from(document.querySelectorAll("body > div")),
          ...Array.from(document.querySelectorAll("body > div > div")),
        ].filter(Boolean);

        possibleContainers.forEach((container) => {
          if (container) {
            container.classList.remove("no-elastic-scroll");
          }
        });

        // 移除直接设置的样式
        document.body.style.removeProperty("touch-action");
        document.body.style.removeProperty("overflow-y");
        document.body.style.removeProperty("overscroll-behavior");

        // 移除阻止触摸移动事件的处理函数
        document.removeEventListener("touchmove", preventVerticalScroll, {
          passive: false,
        } as EventListenerOptions);
      };

      // 阻止垂直滚动的函数 - 修复版本
      const preventVerticalScroll = (e: TouchEvent) => {
        // 在滑动状态下阻止所有垂直滚动
        if (e.cancelable) {
          e.preventDefault();
        }
      };

      return () => {
        // 确保组件卸载时解锁滚动
        if (document.body.classList.contains("no-elastic-scroll")) {
          document.documentElement.classList.remove("no-elastic-scroll");
          document.body.classList.remove("no-elastic-scroll");

          // 移除针对LIFF环境的处理
          const possibleContainers = [
            document.getElementById("__next"),
            document.getElementById("root"),
            document.querySelector(".liff-wrapper"),
            document.querySelector(".liff-container"),
            document.querySelector(".line-container"),
            ...Array.from(document.querySelectorAll('[id^="liff"]')),
            ...Array.from(document.querySelectorAll('[class^="liff"]')),
            ...Array.from(document.querySelectorAll("body > div")),
            ...Array.from(document.querySelectorAll("body > div > div")),
          ].filter(Boolean);

          possibleContainers.forEach((container) => {
            if (container) {
              container.classList.remove("no-elastic-scroll");
            }
          });

          // 移除直接设置的样式
          document.body.style.removeProperty("touch-action");
          document.body.style.removeProperty("overflow-y");
          document.body.style.removeProperty("overscroll-behavior");

          // 移除阻止触摸移动事件的处理函数
          document.removeEventListener("touchmove", preventVerticalScroll, {
            passive: false,
          } as EventListenerOptions);
        }

        // 删除全局函数
        delete window.lockBodyScroll;
        delete window.unlockBodyScroll;
      };
    }, []);

    // 添加滑动状态的引用，用于在组件卸载时清理滚动锁定
    const isSwipingRef = useRef(false);

    // 更新滑动状态的跟踪效果
    useEffect(() => {
      isSwipingRef.current = isHorizontalSwipe.current || showDeleteButton;

      // 在状态变化时，确保滚动锁定状态正确
      if (isSwipingRef.current) {
        // 如果是滑动状态或显示删除按钮，锁定滚动
        if (typeof window.lockBodyScroll === "function") {
          window.lockBodyScroll();
        }
      } else {
        // 否则解锁滚动
        if (typeof window.unlockBodyScroll === "function") {
          window.unlockBodyScroll();
        }
      }

      // 组件卸载时确保解锁滚动
      return () => {
        if (
          isSwipingRef.current &&
          typeof window.unlockBodyScroll === "function"
        ) {
          window.unlockBodyScroll();
        }
      };
    }, [showDeleteButton]);

    // 修改触摸处理效果，使用全局函数
    useEffect(() => {
      // 替代方案：不使用preventDefault，而是添加CSS类控制
      const handleTouchStart = () => {
        if (isHorizontalSwipe.current || showDeleteButton) {
          // 使用全局函数锁定滚动
          if (typeof window.lockBodyScroll === "function") {
            window.lockBodyScroll();
          }
        }
      };

      const handleTouchEnd = () => {
        // 如果没有显示删除按钮，解锁滚动
        if (!showDeleteButton) {
          if (typeof window.unlockBodyScroll === "function") {
            window.unlockBodyScroll();
          }
        }
      };

      // 使用passive: true，避免警告
      document.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      document.addEventListener("touchend", handleTouchEnd, { passive: true });
      document.addEventListener("touchcancel", handleTouchEnd, {
        passive: true,
      });

      return () => {
        document.removeEventListener("touchstart", handleTouchStart);
        document.removeEventListener("touchend", handleTouchEnd);
        document.removeEventListener("touchcancel", handleTouchEnd);
        // 确保清理时恢复滚动
        if (
          document.body.classList.contains("no-elastic-scroll") &&
          typeof window.unlockBodyScroll === "function"
        ) {
          window.unlockBodyScroll();
        }
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
      // console.log(`[回弹功能] handleClick 被触发，交易ID: ${transaction.id}`);

      // 如果是滑動狀態或者剛剛完成滑動，不觸發點擊事件
      if (isDragging || translateX > 10) {
        // console.log(`[回弹功能] handleClick - 滑动状态中，阻止点击，isDragging: ${isDragging}, translateX: ${translateX}`);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 如果刪除按鈕已經顯示，則點擊會收回刪除按鈕
      if (showDeleteButton) {
        // console.log(`[回弹功能] handleClick - 删除按钮已显示，触发收回动画`);
        e.preventDefault();
        e.stopPropagation();

        // 開始收回動畫
        setIsAnimating(true);
        if (itemRef.current) {
          itemRef.current.style.transition = "transform 0.2s ease-out";
          itemRef.current.style.transform = "translateX(0)";

          // 在動畫結束後更新狀態
          setTimeout(() => {
            setTranslateX(0);
            setShowDeleteButton(false);
            setIsAnimating(false);
            // console.log(`[回弹功能] handleClick - 收回动画完成`);
          }, 200);
        }
        return;
      }

      // console.log(`[回弹功能] handleClick - 正常点击，准备调用onTransactionClick`);
      e.preventDefault();
      e.stopPropagation();

      // Call the click handler with a small delay to prevent UI flicker
      setTimeout(() => {
        onTransactionClick(transaction.id);
      }, 10);
    };

    // Handle touch start - record starting position
    const handleTouchStart = (e: React.TouchEvent) => {
      // 立即通知父組件開始操作此項目，確保其他項目立即收回
      onSwipeStateChange(true, transaction.id);

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(), // 記錄開始時間，用於計算速度
      };
      isTouchMoveRef.current = false;
      isHorizontalSwipe.current = false; // 重置水平滑動狀態
      isVerticalScroll.current = false; // 重置垂直滾動狀態
      setIsPressed(true);
      setIsDragging(false); // 初始設置為 false，等確認滑動方向後再設置

      // 在触摸开始时就锁定滚动，无论是否已显示删除按钮
      // 先预防性锁定，稍后在确认为垂直滚动时再解锁
      if (typeof window.lockBodyScroll === "function") {
        window.lockBodyScroll();
      }

      // 如果正在動畫，立即停止
      if (isAnimating && itemRef.current) {
        setIsAnimating(false);
        itemRef.current.style.transition = "none";
      }
    };

    // Handle touch move - update position
    const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return; // 如果還沒開始，不處理移動

      // 注意：我们已经在touchStart阶段锁定了滚动
      // 现在只需要检测是否需要解锁（垂直滚动）

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
      const deltaY = touch.clientY - touchStartRef.current.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // 計算滑動速度（為之後使用）
      const now = Date.now();
      const velocity = deltaX / (now - (touchStartRef.current.time || now));
      touchStartRef.current.time = now;
      touchStartRef.current.lastX = translateX; // 記錄上一個位置

      // 降低水平滑动的检测阈值，更倾向于认为是水平滑动
      // 只在初始方向判断时执行这段逻辑
      if (!isHorizontalSwipe.current && !isVerticalScroll.current) {
        // 降低水平滑动的判定阈值，更易检测为水平滑动
        if (absDeltaX > 5) {
          // 降低水平阈值
          isHorizontalSwipe.current = true; // 標記為水平滑動
          e.stopPropagation();
          // 确保滚动保持锁定状态
          if (typeof window.lockBodyScroll === "function") {
            window.lockBodyScroll();
          }
        }
        // 只有当明显是垂直滑动，且明显不是水平滑动时才解锁
        else if (absDeltaY > 10 && absDeltaY > absDeltaX * 2) {
          isVerticalScroll.current = true; // 標記為垂直滾動
          // 只在确定是垂直滚动时解锁
          if (typeof window.unlockBodyScroll === "function") {
            window.unlockBodyScroll();
          }
          return; // 允許頁面正常滾動
        }
      }

      // 如果已經標記為垂直滾動，跳過水平滑動處理
      if (isVerticalScroll.current) {
        return;
      }

      // 以下是水平滑动逻辑，确保页面不会垂直滚动
      if (isHorizontalSwipe.current || showDeleteButton || absDeltaX > 0) {
        e.stopPropagation();
        // 再次確保鎖定狀態
        if (typeof window.lockBodyScroll === "function") {
          window.lockBodyScroll();
        }
      }

      // 如果已經標記為水平滑動或者準備啟動滑動
      if (isHorizontalSwipe.current || absDeltaX > 0) {
        // 降低启动阈值
        // 設置滑動狀態
        setIsDragging(true);

        // 如果已經顯示刪除按鈕，允許向右滑動恢復原位
        if (showDeleteButton) {
          // 允許範圍: -deleteThreshold 到 0
          const newX = Math.min(
            0,
            Math.max(-deleteThreshold, deltaX - deleteThreshold)
          );
          setTranslateX(newX);
        } else {
          // 正常的向左滑動，限制範圍 -deleteThreshold 到 0
          const newTranslateX = Math.min(0, Math.max(-deleteThreshold, deltaX));
          setTranslateX(newTranslateX);
        }
      }
    };

    // Handle touch end - stop at threshold to show delete button or return to original position
    const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartRef.current) {
        setIsDragging(false);
        return;
      }

      // 計算最終滑動速度與方向
      const endTime = Date.now();
      const duration = endTime - (touchStartRef.current.time || endTime);
      const distance = translateX - (touchStartRef.current.lastX || 0);
      const velocity = (distance / Math.max(1, duration)) * 1000; // 每秒多少像素

      // 檢查是否進行了明顯的滑動
      const isSignificantMovement = Math.abs(translateX) > 5; // 降低判定阈值

      // 根据最终状态决定是否解锁滚动
      // 只有在确定不显示删除按钮时才解锁
      if (
        !showDeleteButton &&
        !isSignificantMovement &&
        !isHorizontalSwipe.current
      ) {
        if (typeof window.unlockBodyScroll === "function") {
          window.unlockBodyScroll();
        }
      } else {
        // 否则继续锁定
        if (typeof window.lockBodyScroll === "function") {
          window.lockBodyScroll();
        }
      }

      // 重置水平滑動和垂直滾動標記
      isHorizontalSwipe.current = false;
      isVerticalScroll.current = false;

      // 如果没有明显滑动，而且显示删除按钮，则关闭删除按钮
      if (
        !isSignificantMovement &&
        !isTouchMoveRef.current &&
        showDeleteButton
      ) {
        // 阻止事件冒泡
        e.stopPropagation();

        // 開始收回動畫
        setIsAnimating(true);
        if (itemRef.current) {
          itemRef.current.style.transition = "transform 0.2s ease-out";
          itemRef.current.style.transform = "translateX(0)";

          // 在動畫結束後更新狀態
          setTimeout(() => {
            setTranslateX(0);
            setShowDeleteButton(false);
            setIsAnimating(false);

            // 关闭删除按钮后解锁滚动
            if (typeof window.unlockBodyScroll === "function") {
              window.unlockBodyScroll();
            }
          }, 200);
        }

        // 重置状态并直接返回
        setIsDragging(false);
        touchStartRef.current = null;
        isTouchMoveRef.current = false;
        setIsPressed(false);
        return;
      }

      // 如果沒有明顯滑動，而且沒有移動過，可能是點擊
      else if (!isSignificantMovement && !isTouchMoveRef.current) {
        // console.log(`[回弹功能] handleTouchEnd - 检测到点击行为，调用onTransactionClick`);
        setIsPressed(true);
        setTimeout(() => {
          onTransactionClick(transaction.id);
          setIsPressed(false);
        }, 150);
      } else {
        // console.log(`[回弹功能] handleTouchEnd - 检测到滑动结束，开始决定最终位置`);
        // 標記開始動畫
        setIsAnimating(true);

        // 默認目標位置 - 回到原始位置
        let targetX = 0;

        // 判斷方向和狀態
        const isRightSwipe = distance > 0; // 是否向右滑動 (正值表示向右)

        // 判断是否为左滑，根据最终距离判断
        if (!isRightSwipe) {
          // 左滑（显示删除按钮）
          if (typeof window.lockBodyScroll === "function") {
            window.lockBodyScroll();
          }
        }

        // 優化判斷邏輯 - 基於當前狀態和滑動方向
        if (showDeleteButton) {
          // 當刪除按鈕已顯示時
          if (isRightSwipe || translateX > -deleteThreshold / 2) {
            // 1. 向右滑動(嘗試收回) 或 2. 已經收回超過一半
            targetX = 0; // 完全收回
            // console.log(`[回弹功能] handleTouchEnd - 删除按钮已显示，但检测到向右滑动或收回超过一半，将完全收回`);
          } else {
            // 否則保持展開
            targetX = -deleteThreshold;
            // console.log(`[回弹功能] handleTouchEnd - 删除按钮已显示，保持展开状态`);
          }
        } else {
          // 當刪除按鈕未顯示時
          if (
            !isRightSwipe &&
            (Math.abs(translateX) > deleteThreshold / 2 || velocity < -500)
          ) {
            // 向左滑動且已經滑動超過一半 或 速度快
            targetX = -deleteThreshold; // 完全展開
            // console.log(`[回弹功能] handleTouchEnd - 删除按钮未显示，向左滑动超过阈值一半或速度足够，将完全展开`);
          } else {
            // 否則回到原位
            targetX = 0;
            // console.log(`[回弹功能] handleTouchEnd - 删除按钮未显示，滑动不足，将回到原位`);
          }
        }

        const shouldShowDelete = targetX < 0;
        // console.log(`[回弹功能] handleTouchEnd - 最终决定: targetX=${targetX}, shouldShowDelete=${shouldShowDelete}`);

        // 如果将要显示删除按钮，立即锁定滚动
        if (shouldShowDelete) {
          if (typeof window.lockBodyScroll === "function") {
            window.lockBodyScroll();
          }
        }

        // 決定動畫時間 - 根據距離調整
        const distanceToTarget = Math.abs(translateX - targetX);
        const animationDuration = Math.min(
          0.3,
          Math.max(0.15, distanceToTarget / 500)
        );
        // console.log(`[回弹功能] handleTouchEnd - 动画参数: 距离=${distanceToTarget.toFixed(2)}px, 持续=${animationDuration.toFixed(2)}秒`);

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
              // console.log(`[回弹功能] handleTouchEnd - 动画完成，状态已更新，showDeleteButton=${shouldShowDelete}`);

              // 根据最终状态决定是否解锁滚动
              if (!shouldShowDelete) {
                if (typeof window.unlockBodyScroll === "function") {
                  // 如果最终不显示删除按钮，解锁滚动
                  window.unlockBodyScroll();
                }
              } else {
                // 如果显示删除按钮，确保滚动仍然锁定
                if (typeof window.lockBodyScroll === "function") {
                  window.lockBodyScroll();
                }
              }

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

          // 根据最终状态决定是否解锁滚动
          if (!shouldShowDelete) {
            if (typeof window.unlockBodyScroll === "function") {
              window.unlockBodyScroll();
            }
          } else {
            // 如果显示删除按钮，确保滚动仍然锁定
            if (typeof window.lockBodyScroll === "function") {
              window.lockBodyScroll();
            }
          }
          // console.log(`[回弹功能] handleTouchEnd - 已在目标位置，直接更新状态`);
        }

        // 阻止事件冒泡，但不阻止默认行为，避免passive监听器错误
        e.stopPropagation();
      }

      // 添加一個小延遲再重置狀態，確保不會意外觸發點擊
      setTimeout(() => {
        setIsDragging(false);
        touchStartRef.current = null;
        isTouchMoveRef.current = false;
        setIsPressed(false);

        // 如果沒有顯示刪除按鈕，通知父組件此項目已不再活動
        if (!showDeleteButton) {
          // console.log(`[回弹功能] handleTouchEnd - 通知父组件此项目不再活动`);
          onSwipeStateChange(false, transaction.id);
        }
      }, 50);
    };

    // Handle touch cancel - reset state
    const handleTouchCancel = () => {
      // 重置所有状态
      isHorizontalSwipe.current = false;
      isVerticalScroll.current = false;
      touchStartRef.current = null;
      isTouchMoveRef.current = false;
      setIsPressed(false);

      // 如果未显示删除按钮，解锁滚动
      if (!showDeleteButton) {
        if (typeof window.unlockBodyScroll === "function") {
          window.unlockBodyScroll();
        }
        onSwipeStateChange(false, transaction.id);
      }
    };

    // Separate handler for keyboard events
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsPressed(true);

        setTimeout(() => {
          onTransactionClick(transaction.id);
          setIsPressed(false);
        }, 150);
      }
    };

    // 修改處理點擊刪除按鈕的函數，只顯示確認彈窗
    const handleDeleteButtonClick = (
      e: React.MouseEvent | React.TouchEvent
    ) => {
      // 阻止事件冒泡并阻止默认行为
      e.stopPropagation();
      e.preventDefault();

      // 保留关键日志
      console.log(`[删除确认] 点击删除按钮，准备显示确认弹窗`);

      // 防止显示后立即被关闭
      setIsShowingDeleteConfirm(true);

      // 设置一个遮挡层，防止任何点击事件穿透
      const blocker = document.createElement("div");
      blocker.style.position = "fixed";
      blocker.style.top = "0";
      blocker.style.left = "0";
      blocker.style.width = "100vw";
      blocker.style.height = "100vh";
      blocker.style.zIndex = "999";
      blocker.style.background = "transparent";
      document.body.appendChild(blocker);

      // 设置一个更长的超时确保弹窗不会被立即关闭
      setTimeout(() => {
        setShowDeleteModal(true);
        console.log(`[删除确认] 确认弹窗已显示`);

        // 移除遮挡层
        setTimeout(() => {
          if (document.body.contains(blocker)) {
            document.body.removeChild(blocker);
          }

          // 确保100ms后我们已经处理完了所有事件
          setTimeout(() => {
            setIsShowingDeleteConfirm(false);
            console.log(`[删除确认] 点击保护已移除`);
          }, 100);
        }, 300); // 延长保护时间到300ms
      }, 50); // 延长到50ms以确保UI完全准备好
    };

    // 修改取消删除函数，确保知道是手动关闭弹窗
    const cancelDelete = () => {
      console.log(`[删除确认] 取消删除，关闭弹窗`);
      // 添加50ms延迟，确保其他事件处理已完成
      setTimeout(() => {
        setShowDeleteModal(false);
      }, 50);
    };

    // 修改确认删除函数，增强调试和错误处理
    const confirmDelete = async () => {
      // 检查是否存在删除回调
      if (!onDelete) {
        console.error("onDelete callback is not defined");
        return;
      }

      // 防止重复点击
      if (isDeleting) {
        console.log("[删除] 删除操作已在进行中，忽略重复点击");
        return;
      }

      console.log(`[删除确认] 确认删除，开始处理, 交易ID: ${transaction.id}`);

      // 立即设置删除状态，防止重复点击
      setIsDeleting(true);

      // 關閉確認彈窗（保留原有的setShowDeleteModal(false)，但移至此处）
      setShowDeleteModal(false);
      console.log(`[删除确认] 确认删除，已关闭弹窗，准备开始删除动画`);

      // 立即給用戶視覺反饋 - 先开始动画
      setTranslateX(0); // 開始收回刪除按鈕
      setIsAnimatingOut(true); // 触发删除动画
      console.log("[删除] 删除动画已触发");

      try {
        // 立即通知父组件处理日期组动画（在API调用前）
        if (onDelete) {
          console.log(`[删除] 调用onDelete回调，ID: ${transaction.id}`);
          onDelete(transaction.id);
          console.log("[删除] 本地状态已立即更新，触发日期组动画");
        }

        // 调用API删除数据（不阻塞UI动画）
        console.log(
          `[删除] 调用API删除交易，ID: ${transaction.id}, 类型: ${
            transaction.type || "未指定"
          }`
        );

        // 删除交易记录
        const success = await deleteTransactionApi(
          transaction.id,
          transaction.type
        );

        console.log(`[删除] API删除结果: ${success ? "成功" : "失败"}`);

        if (success) {
          // 触发自定义事件
          try {
            console.log(`[月度摘要] TransactionItem直接发送删除事件:`, {
              id: transaction.id,
              type: transaction.type,
              amount: transaction.amount,
            });

            // 创建自定义事件
            const event = new CustomEvent("transaction-deleted", {
              detail: {
                deletedTransaction: {
                  id: transaction.id,
                  type: transaction.type,
                  amount: transaction.amount,
                  // 其他必要的信息
                  date: transaction.date,
                  category: transaction.category,
                },
                timestamp: new Date().toISOString(),
              },
              bubbles: true,
            });

            // 分发事件到文档
            document.dispatchEvent(event);
            console.log("[月度摘要] TransactionItem已发送删除事件");
          } catch (error) {
            console.error("[月度摘要] 事件发送失败:", error);
          }

          // 等待动画结束后标记为已删除（使组件从DOM移除）
          setTimeout(() => {
            setIsDeleted(true);
            console.log("[删除] 元素已从DOM中移除");
          }, 250); // 与CSS动画时间匹配
        } else {
          // 如果失敗，重置状态
          console.error("[删除] 删除交易失败 - API返回失败");
          setTranslateX(0);
          setShowDeleteButton(false);
          setIsDeleting(false);
          setIsAnimatingOut(false); // 恢复动画状态
        }
      } catch (error) {
        console.error("[删除] 刪除交易時發生錯誤:", error);
        setTranslateX(0);
        setShowDeleteButton(false);
        setIsDeleting(false);
        setIsAnimatingOut(false); // 恢复动画状态
      }
    };

    // 修改點擊其他地方時的處理
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        // console.log(`[回弹功能] handleClickOutside 被调用，交易ID: ${transaction.id}`);

        // 完全禁用点击外部区域自动弹回的功能
        // 只有在显示删除确认弹窗时才需要阻止冒泡
        if (showDeleteModal || isShowingDeleteConfirm) {
          // 保留关键日志
          console.log(`[删除确认] 弹窗显示中，阻止外部点击`);
          e.stopPropagation();
          return;
        }

        // console.log(`[回弹功能] handleClickOutside - 禁用了自动弹回功能，不执行任何操作`);

        // 下面注释掉的是原来会导致弹回的代码，现在禁用了
        /*
        // 確保刪除按鈕顯示時，處理點擊事件
        if (showDeleteButton && itemRef.current) {
          // 更明確地檢查點擊目標
          const target = e.target as Node;
          const deleteButtonElement = document.querySelector(
            `.delete-button-${transaction.id}`
          );

          // 確保更精確的檢查：目標是否為刪除按鈕或其子元素
          if (
            deleteButtonElement &&
            (deleteButtonElement === target ||
              deleteButtonElement.contains(target))
          ) {
            return; // 如果點擊在刪除按鈕上，不做處理
          }

          // 如果點擊不在刪除按鈕上，收回按鈕並添加動畫效果
          setIsAnimating(true);
          if (itemRef.current) {
            itemRef.current.style.transition = "transform 0.2s ease-out";
            itemRef.current.style.transform = "translateX(0)";

            // 在動畫結束後更新狀態
            setTimeout(() => {
              setTranslateX(0);
              setShowDeleteButton(false);
              setIsAnimating(false);
            }, 200);
          }
        }
        */
      };

      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }, [
      showDeleteButton,
      transaction.id,
      showDeleteModal,
      isShowingDeleteConfirm,
    ]);

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

    // 简化的删除按钮触摸事件处理
    const handleDeleteButtonTouchEnd = (e: React.TouchEvent) => {
      e.stopPropagation();

      // 如果没有滑动，视为点击
      if (!isTouchMoveRef.current) {
        handleDeleteButtonClick(e);
      }

      // 重置状态
      touchStartRef.current = null;
      isTouchMoveRef.current = false;
    };

    // 修改弹窗按钮处理
    const handleModalBackdropClick = (e: React.MouseEvent) => {
      // 阻止事件冒泡，防止触发其他点击事件
      e.stopPropagation();
      // 阻止默认行为
      e.preventDefault();

      // 添加判断，只有当点击的是背景元素时才关闭弹窗
      if (e.target === e.currentTarget) {
        console.log(`[删除确认] 点击了弹窗背景，关闭弹窗`);
        cancelDelete();
      }
    };

    // 添加一个样式类，用于在滑动时禁用用户选择
    useEffect(() => {
      // 当水平滑动或显示删除按钮时，添加样式类以防止用户选择
      if (isHorizontalSwipe.current || showDeleteButton) {
        document.body.classList.add("no-select");
      } else {
        document.body.classList.remove("no-select");
      }

      return () => {
        // 清理：确保移除样式类
        document.body.classList.remove("no-select");
      };
    }, [showDeleteButton]);

    // 进一步修改确认删除按钮的点击处理，针对LIFF环境优化
    const deleteButtonRef = useRef<HTMLButtonElement>(null);
    const buttonClickHandledRef = useRef(false); // 新增引用，用于防止重复处理

    // 独立的删除处理函数，完全与React事件系统分离
    const performDelete = async (
      transactionId: string,
      transactionType: string | undefined
    ) => {
      console.log(`[LIFF删除] 开始执行删除操作，交易ID: ${transactionId}`);

      // 已经处理过，直接返回
      if (buttonClickHandledRef.current) {
        console.log(`[LIFF删除] 已经处理过，忽略此次调用`);
        return;
      }

      // 立即标记为已处理，防止重复触发
      buttonClickHandledRef.current = true;

      // 立即给用户视觉反馈
      setIsDeleting(true);
      setShowDeleteModal(false);
      setTranslateX(0);
      setIsAnimatingOut(true);
      console.log(`[LIFF删除] 视觉反馈已设置，交易ID: ${transactionId}`);

      // 记录API调用开始时间，用于问题诊断
      const apiStartTime = Date.now();

      // 跟踪API是否真正完成(无论成功或失败)
      let apiCompleted = false;

      try {
        // 调用onDelete回调
        if (onDelete) {
          console.log(`[LIFF删除] 调用onDelete回调，ID: ${transactionId}`);
          onDelete(transactionId);
        }

        // 添加API超时保护 - 创建一个Promise包装deleteTransactionApi调用
        const apiCallWithTimeout = async (maxRetries = 2) => {
          let retryCount = 0;
          let lastError = null;

          while (retryCount <= maxRetries) {
            try {
              console.log(
                `[LIFF删除] 调用API删除交易 (尝试 ${retryCount + 1}/${
                  maxRetries + 1
                })，ID: ${transactionId}`
              );

              // 设置超时保护 - 如果API超过5秒未响应，视为失败
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("API调用超时")), 5000)
              );

              // 实际API调用
              const apiPromise = deleteTransactionApi(
                transactionId,
                transactionType
              );

              // 使用Promise.race让先完成的Promise决定结果
              const success = await Promise.race([apiPromise, timeoutPromise]);

              // 标记API已完成
              apiCompleted = true;

              console.log(
                `[LIFF删除] API删除结果: ${success ? "成功" : "失败"} (耗时: ${
                  Date.now() - apiStartTime
                }ms)`
              );

              if (success) {
                return true;
              } else {
                lastError = new Error("API返回失败");
                retryCount++;
              }
            } catch (error) {
              lastError = error;
              console.error(
                `[LIFF删除] API调用失败 (尝试 ${retryCount + 1}/${
                  maxRetries + 1
                }): `,
                error
              );
              retryCount++;
            }

            // 如果需要重试，等待一段时间后再试
            if (retryCount <= maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          // 所有重试都失败了
          throw lastError || new Error("API调用失败");
        };

        // 执行带超时和重试的API调用
        const success = await apiCallWithTimeout();

        if (success) {
          // 发送自定义事件
          try {
            const event = new CustomEvent("transaction-deleted", {
              detail: {
                deletedTransaction: {
                  id: transactionId,
                  type: transactionType,
                  amount: transaction.amount,
                  date: transaction.date,
                  category: transaction.category,
                },
                timestamp: new Date().toISOString(),
              },
              bubbles: true,
            });
            document.dispatchEvent(event);
            console.log(`[LIFF删除] 删除事件已发送: ${transactionId}`);
          } catch (error) {
            console.error("[LIFF删除] 事件发送失败:", error);
          }

          // 等待动画结束后移除元素
          setTimeout(() => {
            setIsDeleted(true);
            console.log(
              `[LIFF删除] 元素已从DOM中移除，交易ID: ${transactionId}`
            );
          }, 250);
        } else {
          // API调用返回失败 - 应该不会达到这里，因为失败会在apiCallWithTimeout中抛出错误
          throw new Error("API返回失败");
        }
      } catch (error) {
        // 接收可能的API调用错误
        console.error(`[LIFF删除] 操作失败，交易ID: ${transactionId}`, error);

        // 通知用户删除失败
        try {
          // 尝试显示错误提示
          const notifyError = () => {
            // 如果当前可见，添加错误提示而不是重置
            if (document.visibilityState === "visible") {
              alert("删除失败，请稍后重试");
            }
          };

          // 使用setTimeout确保在其他状态更新后执行
          setTimeout(notifyError, 300);
        } catch (notifyError) {
          console.error("[LIFF删除] 无法显示错误消息:", notifyError);
        }

        // 恢复UI状态
        setTranslateX(0);
        setShowDeleteButton(false);
        setIsDeleting(false);
        setIsAnimatingOut(false);
        buttonClickHandledRef.current = false; // 重置处理标记

        // 添加一个检查点，确保页面不会意外刷新
        try {
          const preventUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
          };

          // 如果API未完成，添加一个临时的beforeunload事件，防止意外刷新
          if (!apiCompleted) {
            window.addEventListener("beforeunload", preventUnload);

            // 5秒后移除事件监听器
            setTimeout(() => {
              window.removeEventListener("beforeunload", preventUnload);
            }, 5000);
          }
        } catch (pageError) {
          console.error("[LIFF删除] 页面保护设置失败:", pageError);
        }
      }
    };

    // 在组件挂载时设置全局事件委托处理器
    useEffect(() => {
      // 重置处理标记
      buttonClickHandledRef.current = false;

      // 添加全局事件委托处理器，捕获所有点击事件
      const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
        // 确保是我们的删除按钮被点击
        const target = e.target as HTMLElement;

        // 查找匹配当前交易ID的确认删除按钮
        if (
          target &&
          (target.id === `delete-confirm-btn-${transaction.id}` ||
            target.closest(`#delete-confirm-btn-${transaction.id}`))
        ) {
          // 阻止事件默认行为和冒泡
          e.preventDefault();
          e.stopPropagation();

          console.log(
            `[LIFF删除] 捕获到确认删除按钮点击，交易ID: ${transaction.id}`
          );

          // 如果已显示弹窗但未处于删除中，执行删除
          if (
            showDeleteModal &&
            !isDeleting &&
            !buttonClickHandledRef.current
          ) {
            // 立即执行删除
            performDelete(transaction.id, transaction.type);
          }
        }
      };

      // 同时监听点击和触摸结束事件，确保在各种设备上都能正常工作
      document.addEventListener("click", handleGlobalClick, { capture: true });
      document.addEventListener("touchend", handleGlobalClick, {
        capture: true,
      });

      // 添加一个变更观察器，确保在DOM变更时重新检查和绑定事件
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList" && showDeleteModal) {
            const confirmButton = document.getElementById(
              `delete-confirm-btn-${transaction.id}`
            );
            if (confirmButton) {
              console.log(
                `[LIFF删除] 检测到删除确认按钮已加入DOM，确保事件绑定`
              );
              // 为安全起见，直接添加点击事件处理器
              confirmButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isDeleting && !buttonClickHandledRef.current) {
                  console.log(
                    `[LIFF删除] 确认按钮直接点击处理器触发，交易ID: ${transaction.id}`
                  );
                  performDelete(transaction.id, transaction.type);
                }
              };
            }
          }
        }
      });

      // 观察整个文档，以确保捕获到弹窗的渲染
      observer.observe(document.body, { childList: true, subtree: true });

      // 清理函数
      return () => {
        document.removeEventListener("click", handleGlobalClick, {
          capture: true,
        });
        document.removeEventListener("touchend", handleGlobalClick, {
          capture: true,
        });
        observer.disconnect();
        buttonClickHandledRef.current = false;
      };
    }, [
      transaction.id,
      transaction.type,
      showDeleteModal,
      isDeleting,
      onDelete,
    ]);

    // 当弹窗显示时直接绑定事件到确认按钮
    useEffect(() => {
      if (showDeleteModal && !isDeleting) {
        // 使用setTimeout确保DOM已经更新
        setTimeout(() => {
          const confirmButton = document.getElementById(
            `delete-confirm-btn-${transaction.id}`
          );
          if (confirmButton) {
            console.log(
              `[LIFF删除] 弹窗显示时直接绑定事件，交易ID: ${transaction.id}`
            );
            confirmButton.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isDeleting && !buttonClickHandledRef.current) {
                console.log(
                  `[LIFF删除] 直接绑定的点击处理器触发，交易ID: ${transaction.id}`
                );
                performDelete(transaction.id, transaction.type);
              }
            };
          }
        }, 100); // 给DOM更新一点时间
      }
    }, [showDeleteModal, isDeleting, transaction.id, transaction.type]);

    return (
      <div className="relative overflow-hidden" style={deleteAnimationStyle}>
        {/* 刪除確認彈窗 */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn"
            onClick={handleModalBackdropClick}
          >
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl transform animate-scaleInStatic"
              onClick={(e) => {
                // 防止事件冒泡到backdrop
                e.stopPropagation();
                // 阻止默认行为
                e.preventDefault();
              }}
            >
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                  <Trash2 className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  確定要刪除嗎？
                </h3>
                <p className="text-sm text-gray-500">
                  此操作無法復原，刪除後資料將永久消失。
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    cancelDelete();
                  }}
                  className="flex-1 py-2 rounded-xl bg-gray-200 text-gray-700 font-medium transition-all duration-150 active:bg-gray-300"
                >
                  取消
                </button>
                <button
                  ref={deleteButtonRef}
                  id={`delete-confirm-btn-${transaction.id}`}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white font-medium transition-all duration-150 active:bg-red-600"
                  disabled={isDeleting}
                  data-transaction-id={transaction.id}
                  data-action="delete-confirm"
                  type="button" // 明确指定类型
                >
                  {isDeleting ? "删除中..." : "確定刪除"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 刪除按鈕背景 */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-[100px] bg-red-500 flex items-center justify-center delete-button-${transaction.id}`}
          style={{
            transform: `translateX(${translateX < 0 ? 0 : 100}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
          onClick={showDeleteButton ? handleDeleteButtonClick : undefined}
          onTouchStart={(e) => {
            if (showDeleteButton) {
              e.stopPropagation();
              // 记录触摸开始状态，用于后续判断是否点击
              touchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                time: Date.now(),
              };
            }
          }}
          onTouchMove={(e) => {
            if (showDeleteButton && touchStartRef.current) {
              e.stopPropagation();
              // 标记已经移动
              isTouchMoveRef.current = true;
            }
          }}
          onTouchEnd={showDeleteButton ? handleDeleteButtonTouchEnd : undefined}
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
            height: transaction.note ? "auto" : "66px", // 設置沒有備注的交易項目高度為60px
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
  const transactionClickedRef = useRef(false);
  const [isDebugMode, setIsDebugMode] = useState(showDebugInfo);
  const [showAllTimestamps, setShowAllTimestamps] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [showRecurringManager, setShowRecurringManager] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const [deletedTransactionIds, setDeletedTransactionIds] = useState<
    Set<string>
  >(new Set()); // 記錄已刪除的交易ID
  // Add state for tracking date groups being deleted
  const [dateGroupsAnimatingOut, setDateGroupsAnimatingOut] = useState<
    Set<string>
  >(new Set());
  const [isDebugCollapsed, setIsDebugCollapsed] = useState(true); // Default to collapsed

  // 處理刷新定期交易數據
  const handleRecurringDataChanged = () => {
    console.log("定期交易數據已更改，通知父組件重新加載數據");
    if (onTransactionUpdate) {
      // 通知父組件重新獲取數據 (直接使用傳入的交易數據，保持篩選狀態)
      onTransactionUpdate(transactions);
    }
  };

  // 簡化處理交易刪除邏輯 - 完全本地化处理
  const handleDeleteTransaction = async (id: string) => {
    console.log(`[月度摘要] 准备处理删除事件，交易ID: ${id}`);

    // 找到被删除的交易
    const deletedTransaction = transactions.find((t) => t.id === id);

    if (!deletedTransaction) {
      console.error(`[月度摘要] 无法找到要删除的交易，ID: ${id}`);
      return;
    }

    // 解析交易的日期
    let dateKey: string | null = null;
    try {
      if (deletedTransaction.date) {
        const match = deletedTransaction.date.match(/(\d+)年(\d+)月(\d+)日/);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]) - 1;
          const day = parseInt(match[3]);
          const txDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
          dateKey = txDate.toISOString().split("T")[0];
        } else if (
          deletedTransaction.date.includes("-") &&
          deletedTransaction.date.length >= 10
        ) {
          const parts = deletedTransaction.date.substring(0, 10).split("-");
          if (parts.length === 3) {
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);
            const txDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
            dateKey = txDate.toISOString().split("T")[0];
          }
        }
      }
    } catch (error) {
      console.error("解析日期失敗:", error);
    }

    // 立即更新已刪除列表，确保立即将交易项标记为已删除
    setDeletedTransactionIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });

    if (dateKey) {
      // 過濾出同一天的交易（不包含当前删除的和已删除的）
      const sameDay = transactions.filter((t) => {
        // 排除当前正在删除的交易
        if (t.id === id) return false;

        // 排除已经标记为删除的交易
        if (deletedTransactionIds.has(t.id)) return false;

        // 检查是否符合当前活动标签筛选条件
        if (activeTab === "general" ? t.isFixed : !t.isFixed) return false;

        // 轉換交易日期為相同格式 (YYYY-MM-DD)
        let txDateKey: string | null = null;
        try {
          if (t.date) {
            const match = t.date.match(/(\d+)年(\d+)月(\d+)日/);
            if (match) {
              const year = parseInt(match[1]);
              const month = parseInt(match[2]) - 1;
              const day = parseInt(match[3]);
              const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
              txDateKey = date.toISOString().split("T")[0];
            } else if (t.date.includes("-") && t.date.length >= 10) {
              const parts = t.date.substring(0, 10).split("-");
              if (parts.length === 3) {
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[2]);
                const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
                txDateKey = date.toISOString().split("T")[0];
              }
            }
          }
        } catch (error) {
          console.error("處理同日期交易時出錯:", error);
          return false;
        }

        return txDateKey === dateKey;
      });

      // 如果這是該日期的最後一筆交易，立即設置整個日期區塊動畫
      if (sameDay.length === 0) {
        console.log(
          `[日期動畫] 日期 ${dateKey} 的最後一筆交易被刪除，整個區塊將同步消失`
        );

        // 立即设置日期组为动画状态，与交易项同步消失
        setDateGroupsAnimatingOut((prev) => {
          const newSet = new Set(prev);
          newSet.add(dateKey);
          return newSet;
        });

        // 设置动画持续时间与交易项相同
        setTimeout(() => {
          setDateGroupsAnimatingOut((prev) => {
            const newSet = new Set(prev);
            newSet.delete(dateKey!);
            return newSet;
          });
        }, 250); // 与交易项动画完全同步
      }
    }

    // 直接发送当前删除的交易信息，而不是所有已删除的交易
    try {
      console.log(
        `[月度摘要] 发送交易删除事件: ${JSON.stringify({
          id: deletedTransaction.id,
          type: deletedTransaction.type,
          amount: deletedTransaction.amount,
        })}`
      );

      // 创建自定义事件
      const event = new CustomEvent("transaction-deleted", {
        detail: {
          deletedTransaction: deletedTransaction,
          timestamp: new Date().toISOString(),
        },
        bubbles: true,
      });

      // 分发事件到文档，让月度摘要组件捕获并处理
      document.dispatchEvent(event);
      console.log("[月度摘要] 通过事件静默更新摘要 - 无需刷新UI");
    } catch (error) {
      console.error("[月度摘要] 事件更新失败:", error);
    }
  };

  // 處理滑動狀態變化 - 改為立即通知其他項目關閉
  const handleSwipeStateChange = (isOpen: boolean, transactionId: string) => {
    // console.log(`[回弹功能] handleSwipeStateChange - 状态: ${isOpen ? '打开' : '关闭'}, 交易ID: ${transactionId}`);

    // 任何觸摸操作立即設置新的活動項目
    if (isOpen) {
      // 如果已經有活動項目且不是當前項目，需要關閉之前的項目
      if (activeSwipeId !== null && activeSwipeId !== transactionId) {
        // console.log(`[回弹功能] handleSwipeStateChange - 发现已有活动项目(${activeSwipeId})，将关闭并切换到新项目(${transactionId})`);
        // 強制立即更新
        requestAnimationFrame(() => {
          setActiveSwipeId(transactionId);
        });
      } else {
        // console.log(`[回弹功能] handleSwipeStateChange - 设置新的活动项目: ${transactionId}`);
        setActiveSwipeId(transactionId);
      }
    } else if (activeSwipeId === transactionId) {
      // 如果是當前活動項目被關閉，清除引用
      // console.log(`[回弹功能] handleSwipeStateChange - 当前活动项目(${transactionId})被关闭，清除活动项目引用`);
      setActiveSwipeId(null);
    }
  };

  // 修改 shouldCloseItem 函數，更有效地關閉其他項目
  const shouldCloseItem = (transactionId: string): boolean => {
    // 只要有活動項目且不是當前項目，就應該關閉
    const shouldClose =
      activeSwipeId !== null && activeSwipeId !== transactionId;
    // if (shouldClose) {
    //   console.log(`[回弹功能] shouldCloseItem - 检测到需要关闭项目，当前活动ID: ${activeSwipeId}, 项目ID: ${transactionId}`);
    // }
    return shouldClose;
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

  // Add a useEffect to update isDebugMode when showDebugInfo changes
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
  const handleTransactionClick = (id: string) => {
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
  const DebugPanel: React.FC = () => {
    if (!isDebugMode) return null;

    return isDebugCollapsed ? (
      // Collapsed view - small indicator at bottom right
      <div
        className="fixed bottom-2 right-2 bg-gray-800 text-white px-3 py-1.5 rounded-full text-xs shadow-lg z-50 flex items-center cursor-pointer"
        onClick={() => setIsDebugCollapsed(false)}
      >
        <span className="mr-1">Debug</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </div>
    ) : (
      // Expanded view - full debug panel
      <div className="fixed top-0 left-0 right-0 bg-gray-900 text-white p-3 z-50 overflow-auto max-h-[70vh] text-xs">
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold">Transaction List Debug Info:</div>
          <button
            className="text-white hover:text-gray-300 p-1"
            onClick={() => setIsDebugCollapsed(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
        <div className="mb-2">
          <div>Active Tab: {activeTab}</div>
          <div>Is Loading: {isLoading ? "Yes" : "No"}</div>
          <div>Is Tab Switching: {isTabSwitching ? "Yes" : "No"}</div>
          <div>Transaction Count: {transactions.length}</div>
          <div>Current Date: {currentDate.toISOString()}</div>
          <div>
            Display Transactions Count:{" "}
            {Object.values(groupedTransactions).flat().length}
          </div>
        </div>
        {/* ... existing code ... */}
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

  // 所有記錄（一般和定期）都使用相同的日期分組顯示邏輯
  return (
    <>
      <DebugPanel />
      <div className={`space-y-4 ${activeTab === "fixed" ? "pb-24" : "pb-4"}`}>
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

            // 檢查此日期組是否正在動畫中
            const isAnimatingOut = dateGroupsAnimatingOut.has(date);

            // 添加動畫樣式，使用與交易項目相同的動畫時間和曲線
            const dateGroupAnimationStyle = isAnimatingOut
              ? {
                  opacity: 0,
                  maxHeight: "0px",
                  marginTop: "0px",
                  marginBottom: "0px",
                  paddingTop: "0px", // 添加与交易项相同的padding动画
                  paddingBottom: "0px", // 添加与交易项相同的padding动画
                  overflow: "hidden",
                  transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)", // 确保与交易项完全一致的动画曲线
                }
              : {
                  opacity: 1,
                  maxHeight: "1000px", // 确保足够大以容纳所有内容
                  transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
                };

            return (
              <div
                key={`date-${date}`}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
                style={{
                  ...fadeInAnimation,
                  ...dateGroupAnimationStyle, // 应用到整个日期组
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
                          // 直接触发删除处理，不再设置延迟
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

        {/* 管理定期收支按鈕 - 只在定期標籤顯示 */}
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
                  // 更新本地的交易記錄
                  const updatedTransactions = transactions.map((t) =>
                    t.id === updatedTransaction.id ? updatedTransaction : t
                  );

                  // 觸發父組件重新獲取數據
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
