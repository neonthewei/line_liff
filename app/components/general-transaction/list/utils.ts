import { Transaction } from "@/types/transaction";

/**
 * 将时间戳格式化为用户友好的格式
 */
export const formatTimestamp = (timestamp: string | undefined): string => {
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

/**
 * 根据活动标签和已删除ID过滤交易数据
 */
export const filterTransactions = (
  transactions: Transaction[],
  activeTab: "general" | "fixed",
  deletedIds: Set<string>
): Transaction[] => {
  return transactions.filter(
    (transaction) =>
      (activeTab === "general" ? !transaction.isFixed : transaction.isFixed) &&
      !deletedIds.has(transaction.id)
  );
};

/**
 * 按日期分组交易数据
 */
export const groupTransactionsByDate = (
  transactions: Transaction[]
): Record<string, Transaction[]> => {
  const groupedByDate: Record<string, Transaction[]> = {};

  transactions.forEach((transaction) => {
    // 从 "YYYY年MM月DD日" 格式解析日期
    let date: string;
    try {
      // 首先检查 transaction.date 是否存在
      if (!transaction.date) {
        console.error("交易日期缺失:", transaction);
        date = new Date().toISOString().split("T")[0];
      } else {
        // 尝试匹配 "YYYY年MM月DD日" 格式
        const match = transaction.date.match(/(\d+)年(\d+)月(\d+)日/);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]) - 1; // JavaScript 月份从 0 开始
          const day = parseInt(match[3]);

          // 检查解析出的日期是否有效
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
            console.error("日期解析结果无效:", year, month, day);
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
          // 尝试解析 ISO 格式日期 (YYYY-MM-DD)
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
          // 尝试直接解析日期字符串
          const txDate = new Date(transaction.date);
          if (!isNaN(txDate.getTime())) {
            date = txDate.toISOString().split("T")[0];
          } else {
            console.error("无法解析日期格式:", transaction.date);
            date = new Date().toISOString().split("T")[0];
          }
        }
      }
    } catch (error) {
      console.error("日期解析错误:", error, transaction.date);
      // 如果解析失败，使用当前日期
      date = new Date().toISOString().split("T")[0];
    }

    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push(transaction);
  });

  // 对每个日期组内的交易按 updated_at 排序
  Object.keys(groupedByDate).forEach((date) => {
    groupedByDate[date].sort((a, b) => {
      // 如果没有 updated_at，则使用 created_at
      const aTime = a.updated_at || a.created_at || "";
      const bTime = b.updated_at || b.created_at || "";

      // 如果都没有时间戳，保持原顺序
      if (!aTime && !bTime) return 0;
      if (!aTime) return 1;
      if (!bTime) return -1;

      // 比较时间戳，降序排列（最新的在前）
      return bTime.localeCompare(aTime);
    });
  });

  return groupedByDate;
};

/**
 * 计算日期组的总收入和支出
 */
export const calculateDateGroupTotals = (transactions: Transaction[]) => {
  const expenseTotal = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const incomeTotal = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);

  return { expenseTotal, incomeTotal };
};

/**
 * 格式化日期为本地格式
 */
export const formatLocalDate = (date: string) => {
  return new Date(date).toLocaleDateString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
};
