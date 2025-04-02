import { useState, useRef, useEffect } from "react";

/**
 * 滚动锁定钩子，用于控制页面滚动
 */
export const useScrollLock = () => {
  useEffect(() => {
    // 滚动锁定/解锁函数
    window.lockBodyScroll = () => {
      document.documentElement.classList.add("no-elastic-scroll");
      document.body.classList.add("no-elastic-scroll");

      // 添加针对LIFF环境的处理
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
          container.classList.add("no-elastic-scroll");
        }
      });

      document.body.style.setProperty("touch-action", "pan-x", "important");
      document.body.style.setProperty("overflow-y", "hidden", "important");
      document.body.style.setProperty(
        "overscroll-behavior",
        "none",
        "important"
      );

      document.addEventListener("touchmove", preventVerticalScroll, {
        passive: false,
      });
    };

    window.unlockBodyScroll = () => {
      document.documentElement.classList.remove("no-elastic-scroll");
      document.body.classList.remove("no-elastic-scroll");

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

      document.body.style.removeProperty("touch-action");
      document.body.style.removeProperty("overflow-y");
      document.body.style.removeProperty("overscroll-behavior");

      document.removeEventListener("touchmove", preventVerticalScroll, {
        passive: false,
      } as EventListenerOptions);
    };

    // 阻止垂直滚动的函数
    const preventVerticalScroll = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    return () => {
      // 确保组件卸载时解锁滚动
      if (document.body.classList.contains("no-elastic-scroll")) {
        document.documentElement.classList.remove("no-elastic-scroll");
        document.body.classList.remove("no-elastic-scroll");

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

        document.body.style.removeProperty("touch-action");
        document.body.style.removeProperty("overflow-y");
        document.body.style.removeProperty("overscroll-behavior");

        document.removeEventListener("touchmove", preventVerticalScroll, {
          passive: false,
        } as EventListenerOptions);
      }

      // 删除全局函数
      delete window.lockBodyScroll;
      delete window.unlockBodyScroll;
    };
  }, []);

  return {
    lockBodyScroll: window.lockBodyScroll,
    unlockBodyScroll: window.unlockBodyScroll,
  };
};

/**
 * 滑动状态管理钩子
 */
export const useSwipeState = () => {
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);

  const handleSwipeStateChange = (isOpen: boolean, transactionId: string) => {
    if (isOpen) {
      if (activeSwipeId !== null && activeSwipeId !== transactionId) {
        requestAnimationFrame(() => {
          setActiveSwipeId(transactionId);
        });
      } else {
        setActiveSwipeId(transactionId);
      }
    } else if (activeSwipeId === transactionId) {
      setActiveSwipeId(null);
    }
  };

  const shouldCloseItem = (transactionId: string): boolean => {
    return activeSwipeId !== null && activeSwipeId !== transactionId;
  };

  return { activeSwipeId, handleSwipeStateChange, shouldCloseItem };
};

/**
 * 删除交易处理钩子
 */
export const useDeleteTransaction = (
  transactions: any[],
  activeTab: "general" | "fixed",
  onUpdate?: (updatedTransactions: any[]) => void
) => {
  const [deletedTransactionIds, setDeletedTransactionIds] = useState<
    Set<string>
  >(new Set());
  const [dateGroupsAnimatingOut, setDateGroupsAnimatingOut] = useState<
    Set<string>
  >(new Set());

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

    // 立即更新已删除列表
    setDeletedTransactionIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });

    if (dateKey) {
      // 过滤出同一天的交易
      const sameDay = transactions.filter((t) => {
        // 排除当前正在删除的交易
        if (t.id === id) return false;

        // 排除已经标记为删除的交易
        if (deletedTransactionIds.has(t.id)) return false;

        // 检查是否符合当前活动标签筛选条件
        if (activeTab === "general" ? t.isFixed : !t.isFixed) return false;

        // 转换交易日期为相同格式 (YYYY-MM-DD)
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
          console.error("处理同日期交易时出错:", error);
          return false;
        }

        return txDateKey === dateKey;
      });

      // 如果这是该日期的最后一笔交易，立即设置整个日期区块动画
      if (sameDay.length === 0) {
        console.log(
          `[日期动画] 日期 ${dateKey} 的最后一笔交易被删除，整个区块将同步消失`
        );

        // 立即设置日期组为动画状态
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
        }, 250);
      }
    }

    // 发送自定义事件
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

      // 分发事件到文档
      document.dispatchEvent(event);
      console.log("[月度摘要] 通过事件静默更新摘要 - 无需刷新UI");
    } catch (error) {
      console.error("[月度摘要] 事件更新失败:", error);
    }
  };

  return {
    deletedTransactionIds,
    dateGroupsAnimatingOut,
    handleDeleteTransaction,
  };
};

/**
 * Debug模式钩子
 */
export const useDebugMode = (initialDebugMode: boolean = false) => {
  const [isDebugMode, setIsDebugMode] = useState(initialDebugMode);
  const [showAllTimestamps, setShowAllTimestamps] = useState(false);
  const [isDebugCollapsed, setIsDebugCollapsed] = useState(true);

  // 添加全局键盘事件监听器，用于切换所有时间戳显示
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 检查是否按下 'o' 或 'O' 键
      if (e.key.toLowerCase() === "o") {
        setShowAllTimestamps((prev) => !prev);
      }
    };

    // 添加事件监听器
    window.addEventListener("keydown", handleGlobalKeyDown);

    // 清理函数
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  const handleToggleDebugMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDebugMode((prev) => !prev);
  };

  return {
    isDebugMode,
    setIsDebugMode,
    showAllTimestamps,
    isDebugCollapsed,
    setIsDebugCollapsed,
    handleToggleDebugMode,
  };
};

// 为了解决类型错误，添加全局声明
declare global {
  interface Window {
    lockBodyScroll?: () => void;
    unlockBodyScroll?: () => void;
  }
}
