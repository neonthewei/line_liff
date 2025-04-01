"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import { ChevronRight, Bug, Trash2 } from "lucide-react";
import { formatTimestamp } from "./utils";
import type { Transaction } from "@/types/transaction";
import { deleteTransactionApi } from "@/utils/api";
import { TransactionItemProps } from "./types";

// 导出 memo 化的组件以提高性能
export const TransactionItem = memo(
  ({
    transaction,
    onTransactionClick,
    showDebugInfo = false,
    showTimestamp = false,
    onDelete,
    onSwipeStateChange,
    shouldClose,
  }: TransactionItemProps) => {
    // State
    const [isPressed, setIsPressed] = useState(false);
    const [translateX, setTranslateX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [showDeleteButton, setShowDeleteButton] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isShowingDeleteConfirm, setIsShowingDeleteConfirm] = useState(false);

    // Refs
    const itemRef = useRef<HTMLDivElement>(null);
    const touchStartRef = useRef<{
      x: number;
      y: number;
      time?: number;
      lastX?: number;
    } | null>(null);
    const isTouchMoveRef = useRef(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const isHorizontalSwipe = useRef(false);
    const isVerticalScroll = useRef(false);
    const deleteButtonRef = useRef<HTMLButtonElement>(null);
    const buttonClickHandledRef = useRef(false);
    const isSwipingRef = useRef(false);

    // Constants
    const deleteThreshold = 100; // 滑动删除阈值

    // 优化收回动画
    useEffect(() => {
      if (shouldClose && (showDeleteButton || translateX < 0)) {
        if (itemRef.current) {
          itemRef.current.style.transition =
            "transform 0.08s cubic-bezier(0.2, 0, 0.4, 1)";
          itemRef.current.style.transform = "translateX(0)";
        }

        setTranslateX(0);
        setShowDeleteButton(false);
        setIsAnimating(true);

        setTimeout(() => {
          setIsAnimating(false);
        }, 80);
      }
    }, [shouldClose, showDeleteButton, translateX]);

    // 当删除按钮状态变化时，通知父组件
    useEffect(() => {
      onSwipeStateChange(showDeleteButton, transaction.id);
    }, [showDeleteButton, onSwipeStateChange, transaction.id]);

    // 触摸处理
    const handleTouchStart = (e: React.TouchEvent) => {
      onSwipeStateChange(true, transaction.id);

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      isTouchMoveRef.current = false;
      isHorizontalSwipe.current = false;
      isVerticalScroll.current = false;
      setIsPressed(true);
      setIsDragging(false);

      if (typeof window.lockBodyScroll === "function") {
        window.lockBodyScroll();
      }

      if (isAnimating && itemRef.current) {
        setIsAnimating(false);
        itemRef.current.style.transition = "none";
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      if (isAnimating) {
        setIsAnimating(false);
        if (itemRef.current) {
          const currentTransform = window.getComputedStyle(
            itemRef.current
          ).transform;
          itemRef.current.style.transition = "none";
          if (currentTransform && currentTransform !== "none") {
            itemRef.current.style.transform = currentTransform;
          } else {
            itemRef.current.style.transform = `translateX(${translateX}px)`;
          }
        }
      }

      isTouchMoveRef.current = true;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      const now = Date.now();
      const velocity = deltaX / (now - (touchStartRef.current.time || now));
      touchStartRef.current.time = now;
      touchStartRef.current.lastX = translateX;

      if (!isHorizontalSwipe.current && !isVerticalScroll.current) {
        if (absDeltaX > 5) {
          isHorizontalSwipe.current = true;
          e.stopPropagation();
          if (typeof window.lockBodyScroll === "function") {
            window.lockBodyScroll();
          }
        } else if (absDeltaY > 10 && absDeltaY > absDeltaX * 2) {
          isVerticalScroll.current = true;
          if (typeof window.unlockBodyScroll === "function") {
            window.unlockBodyScroll();
          }
          return;
        }
      }

      if (isVerticalScroll.current) {
        return;
      }

      if (isHorizontalSwipe.current || showDeleteButton || absDeltaX > 0) {
        e.stopPropagation();
        if (typeof window.lockBodyScroll === "function") {
          window.lockBodyScroll();
        }
      }

      if (isHorizontalSwipe.current || absDeltaX > 0) {
        setIsDragging(true);

        if (showDeleteButton) {
          const newX = Math.min(
            0,
            Math.max(-deleteThreshold, deltaX - deleteThreshold)
          );
          setTranslateX(newX);
        } else {
          const newTranslateX = Math.min(0, Math.max(-deleteThreshold, deltaX));
          setTranslateX(newTranslateX);
        }
      }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartRef.current) {
        setIsDragging(false);
        return;
      }

      const endTime = Date.now();
      const duration = endTime - (touchStartRef.current.time || endTime);
      const distance = translateX - (touchStartRef.current.lastX || 0);
      const velocity = (distance / Math.max(1, duration)) * 1000;

      const isSignificantMovement = Math.abs(translateX) > 5;

      if (
        !showDeleteButton &&
        !isSignificantMovement &&
        !isHorizontalSwipe.current
      ) {
        if (typeof window.unlockBodyScroll === "function") {
          window.unlockBodyScroll();
        }
      } else {
        if (typeof window.lockBodyScroll === "function") {
          window.lockBodyScroll();
        }
      }

      isHorizontalSwipe.current = false;
      isVerticalScroll.current = false;

      if (
        !isSignificantMovement &&
        !isTouchMoveRef.current &&
        showDeleteButton
      ) {
        e.stopPropagation();

        setIsAnimating(true);
        if (itemRef.current) {
          itemRef.current.style.transition = "transform 0.2s ease-out";
          itemRef.current.style.transform = "translateX(0)";

          setTimeout(() => {
            setTranslateX(0);
            setShowDeleteButton(false);
            setIsAnimating(false);

            if (typeof window.unlockBodyScroll === "function") {
              window.unlockBodyScroll();
            }
          }, 200);
        }

        setIsDragging(false);
        touchStartRef.current = null;
        isTouchMoveRef.current = false;
        setIsPressed(false);
        return;
      } else if (!isSignificantMovement && !isTouchMoveRef.current) {
        setIsPressed(true);
        setTimeout(() => {
          onTransactionClick(transaction.id);
          setIsPressed(false);
        }, 150);
      } else {
        setIsAnimating(true);

        let targetX = 0;
        const isRightSwipe = distance > 0;

        if (!isRightSwipe) {
          if (typeof window.lockBodyScroll === "function") {
            window.lockBodyScroll();
          }
        }

        if (showDeleteButton) {
          if (isRightSwipe || translateX > -deleteThreshold / 2) {
            targetX = 0;
          } else {
            targetX = -deleteThreshold;
          }
        } else {
          if (
            !isRightSwipe &&
            (Math.abs(translateX) > deleteThreshold / 2 || velocity < -500)
          ) {
            targetX = -deleteThreshold;
          } else {
            targetX = 0;
          }
        }

        const shouldShowDelete = targetX < 0;

        if (shouldShowDelete) {
          if (typeof window.lockBodyScroll === "function") {
            window.lockBodyScroll();
          }
        }

        const distanceToTarget = Math.abs(translateX - targetX);
        const animationDuration = Math.min(
          0.3,
          Math.max(0.15, distanceToTarget / 500)
        );

        if (translateX !== targetX) {
          if (itemRef.current) {
            itemRef.current.style.transition = `transform ${animationDuration}s cubic-bezier(0.1, 0.9, 0.2, 1)`;
            itemRef.current.style.transform = `translateX(${targetX}px)`;

            setTimeout(() => {
              setTranslateX(targetX);
              setShowDeleteButton(shouldShowDelete);
              setIsAnimating(false);

              if (!shouldShowDelete) {
                if (typeof window.unlockBodyScroll === "function") {
                  window.unlockBodyScroll();
                }
              } else {
                if (typeof window.lockBodyScroll === "function") {
                  window.lockBodyScroll();
                }
              }

              if (itemRef.current) {
                itemRef.current.style.transition = isDragging
                  ? "none"
                  : "transform 0.2s ease-out";
              }
            }, animationDuration * 1000);
          }
        } else {
          setShowDeleteButton(shouldShowDelete);
          setIsAnimating(false);

          if (!shouldShowDelete) {
            if (typeof window.unlockBodyScroll === "function") {
              window.unlockBodyScroll();
            }
          } else {
            if (typeof window.lockBodyScroll === "function") {
              window.lockBodyScroll();
            }
          }
        }

        e.stopPropagation();
      }

      setTimeout(() => {
        setIsDragging(false);
        touchStartRef.current = null;
        isTouchMoveRef.current = false;
        setIsPressed(false);

        if (!showDeleteButton) {
          onSwipeStateChange(false, transaction.id);
        }
      }, 50);
    };

    // 处理鼠标点击
    const handleClick = (e: React.MouseEvent) => {
      if (isDragging || translateX > 10) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (showDeleteButton) {
        e.preventDefault();
        e.stopPropagation();

        setIsAnimating(true);
        if (itemRef.current) {
          itemRef.current.style.transition = "transform 0.2s ease-out";
          itemRef.current.style.transform = "translateX(0)";

          setTimeout(() => {
            setTranslateX(0);
            setShowDeleteButton(false);
            setIsAnimating(false);
          }, 200);
        }
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      setTimeout(() => {
        onTransactionClick(transaction.id);
      }, 10);
    };

    // 处理点击删除按钮
    const handleDeleteButtonClick = (
      e: React.MouseEvent | React.TouchEvent
    ) => {
      e.stopPropagation();
      e.preventDefault();

      console.log(`[删除确认] 点击删除按钮，准备显示确认弹窗`);

      setIsShowingDeleteConfirm(true);

      const blocker = document.createElement("div");
      blocker.style.position = "fixed";
      blocker.style.top = "0";
      blocker.style.left = "0";
      blocker.style.width = "100vw";
      blocker.style.height = "100vh";
      blocker.style.zIndex = "999";
      blocker.style.background = "transparent";
      document.body.appendChild(blocker);

      setTimeout(() => {
        setShowDeleteModal(true);
        console.log(`[删除确认] 确认弹窗已显示`);

        setTimeout(() => {
          if (document.body.contains(blocker)) {
            document.body.removeChild(blocker);
          }

          setTimeout(() => {
            setIsShowingDeleteConfirm(false);
            console.log(`[删除确认] 点击保护已移除`);
          }, 100);
        }, 300);
      }, 50);
    };

    // 取消删除
    const cancelDelete = () => {
      console.log(`[删除确认] 取消删除，关闭弹窗`);
      setTimeout(() => {
        setShowDeleteModal(false);
      }, 50);
    };

    // 确认删除
    const confirmDelete = async () => {
      if (!onDelete) {
        console.error("onDelete callback is not defined");
        return;
      }

      if (isDeleting) {
        console.log("[删除] 删除操作已在进行中，忽略重复点击");
        return;
      }

      console.log(`[删除确认] 确认删除，开始处理, 交易ID: ${transaction.id}`);

      setIsDeleting(true);
      setShowDeleteModal(false);

      setTranslateX(0);
      setIsAnimatingOut(true);

      try {
        if (onDelete) {
          console.log(`[删除] 调用onDelete回调，ID: ${transaction.id}`);
          onDelete(transaction.id);
        }

        console.log(`[删除] 调用API删除交易，ID: ${transaction.id}`);

        const success = await deleteTransactionApi(
          transaction.id,
          transaction.type
        );

        console.log(`[删除] API删除结果: ${success ? "成功" : "失败"}`);

        if (success) {
          try {
            const event = new CustomEvent("transaction-deleted", {
              detail: {
                deletedTransaction: {
                  id: transaction.id,
                  type: transaction.type,
                  amount: transaction.amount,
                  date: transaction.date,
                  category: transaction.category,
                },
                timestamp: new Date().toISOString(),
              },
              bubbles: true,
            });

            document.dispatchEvent(event);
          } catch (error) {
            console.error("[月度摘要] 事件发送失败:", error);
          }

          setTimeout(() => {
            setIsDeleted(true);
          }, 250);
        } else {
          setTranslateX(0);
          setShowDeleteButton(false);
          setIsDeleting(false);
          setIsAnimatingOut(false);
        }
      } catch (error) {
        console.error("[删除] 刪除交易時發生錯誤:", error);
        setTranslateX(0);
        setShowDeleteButton(false);
        setIsDeleting(false);
        setIsAnimatingOut(false);
      }
    };

    // 如果已删除，则不渲染此项目
    if (isDeleted) {
      return null;
    }

    // 定义删除动画样式
    const deleteAnimationStyle = isAnimatingOut
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
          maxHeight: "200px",
          transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        };

    // 获取格式化的时间戳
    const timestamp = formatTimestamp(
      transaction.updated_at || transaction.created_at
    );

    return (
      <div className="relative overflow-hidden" style={deleteAnimationStyle}>
        {/* 删除确认弹窗 */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (e.target === e.currentTarget) {
                cancelDelete();
              }
            }}
          >
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl transform animate-scaleInStatic"
              onClick={(e) => {
                e.stopPropagation();
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
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!isDeleting && !buttonClickHandledRef.current) {
                      confirmDelete();
                    }
                  }}
                >
                  {isDeleting ? "删除中..." : "確定刪除"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 删除按钮背景 */}
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
              isTouchMoveRef.current = true;
            }
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (!isTouchMoveRef.current) {
              handleDeleteButtonClick(e);
            }
            touchStartRef.current = null;
            isTouchMoveRef.current = false;
          }}
        >
          {isDeleting ? (
            <span className="text-white text-sm">刪除中...</span>
          ) : (
            <Trash2 className="h-6 w-6 text-white" />
          )}
        </div>

        {/* 交易项目内容 */}
        <div
          ref={itemRef}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          role="button"
          tabIndex={0}
          aria-label={`${transaction.category} ${transaction.amount}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsPressed(true);
              setTimeout(() => {
                onTransactionClick(transaction.id);
                setIsPressed(false);
              }, 150);
            }
          }}
          className={`relative px-4 py-3 flex items-center justify-between cursor-pointer transition-colors duration-150 bg-white ${
            isPressed ? "bg-gray-100" : ""
          }`}
          style={{
            transform: `translateX(${translateX}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
            zIndex: 1,
            height: transaction.note ? "auto" : "66px",
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
