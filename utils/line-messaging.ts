import liff from "@line/liff";
import { Transaction } from "@/types/transaction";

/**
 * 檢查是否可以發送訊息
 * @returns 是否可以發送訊息
 */
const canSendMessages = (): boolean => {
  // 檢查是否在 LIFF 客戶端中
  if (!liff.isInClient()) {
    console.log("Not in LIFF client, cannot send messages");
    return false;
  }

  // 檢查是否已初始化
  try {
    // 嘗試獲取 context，如果失敗則表示未初始化或沒有權限
    const context = liff.getContext();
    if (!context) {
      console.log("LIFF context not available");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking LIFF context:", error);
    return false;
  }
};

/**
 * 發送交易更新通知到用戶的 LINE 聊天室
 * @param transaction 更新後的交易資料
 * @returns 是否成功發送
 */
export const sendUpdateNotification = async (transaction: Transaction): Promise<boolean> => {
  try {
    // 檢查是否可以發送訊息
    if (!canSendMessages()) {
      return false;
    }

    // 格式化金額顯示
    const formattedAmount = Math.abs(transaction.amount).toLocaleString('zh-TW');
    const amountPrefix = transaction.type === 'income' ? '+' : '-';
    
    // 建立通知訊息
    await liff.sendMessages([
      {
        type: "text",
        text: `📝 交易已更新！\n\n類別：${transaction.category}\n金額：${amountPrefix}${formattedAmount}\n日期：${transaction.date}\n備註：${transaction.note || '無'}`
      }
    ]);
    
    console.log("Update notification sent successfully");
    return true;
  } catch (error) {
    // 檢查是否是權限錯誤
    if (error && typeof error === 'object' && 'code' in error && error.code === 403) {
      console.error("Permission denied: chat_message.write scope is not enabled");
    } else {
      console.error("Error sending update notification:", error);
    }
    return false;
  }
};

/**
 * 發送交易刪除通知到用戶的 LINE 聊天室
 * @param transaction 被刪除的交易資料
 * @returns 是否成功發送
 */
export const sendDeleteNotification = async (transaction: Transaction): Promise<boolean> => {
  try {
    // 檢查是否可以發送訊息
    if (!canSendMessages()) {
      return false;
    }

    // 格式化金額顯示
    const formattedAmount = Math.abs(transaction.amount).toLocaleString('zh-TW');
    const amountPrefix = transaction.type === 'income' ? '+' : '-';
    
    // 建立通知訊息
    await liff.sendMessages([
      {
        type: "text",
        text: `🗑️ 交易已刪除！\n\n類別：${transaction.category}\n金額：${amountPrefix}${formattedAmount}\n日期：${transaction.date}`
      }
    ]);
    
    console.log("Delete notification sent successfully");
    return true;
  } catch (error) {
    // 檢查是否是權限錯誤
    if (error && typeof error === 'object' && 'code' in error && error.code === 403) {
      console.error("Permission denied: chat_message.write scope is not enabled");
    } else {
      console.error("Error sending delete notification:", error);
    }
    return false;
  }
};

/**
 * 分享交易資訊到好友或群組
 * @param transaction 要分享的交易資料
 * @returns 是否成功分享
 */
export const shareTransactionToFriends = async (transaction: Transaction): Promise<boolean> => {
  try {
    // 確保 LIFF 已初始化
    if (!liff.isInClient() && !liff.isLoggedIn()) {
      console.log("Not in LIFF client or not logged in, cannot share messages");
      return false;
    }

    // 格式化金額顯示
    const formattedAmount = Math.abs(transaction.amount).toLocaleString('zh-TW');
    const amountPrefix = transaction.type === 'income' ? '+' : '-';
    const typeText = transaction.type === 'income' ? '收入' : '支出';
    
    // 使用 shareTargetPicker 分享訊息
    const result = await liff.shareTargetPicker([
      {
        type: "text",
        text: `💰 ${typeText}紀錄分享\n\n類別：${transaction.category}\n金額：${amountPrefix}${formattedAmount}\n日期：${transaction.date}\n備註：${transaction.note || '無'}`
      }
    ]);
    
    if (result) {
      console.log("Transaction shared successfully");
      return true;
    } else {
      console.log("Transaction sharing was cancelled");
      return false;
    }
  } catch (error) {
    console.error("Error sharing transaction:", error);
    return false;
  }
}; 