"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { initializeLiff, navigateInLiff, login } from "@/utils/liff";
import type { Transaction } from "@/types/transaction";
import {
  MonthSelector,
  MonthSummary,
  TabSelector,
} from "@/components/shared/ui";
import {
  fetchTransactionsByUser,
  fetchMonthlySummary,
  clearTransactionCache,
  fetchAccountBookMonthlySummary,
  fetchUserAccountBooks,
} from "@/utils/api";
import { TransactionList } from "@/components/general-transaction";
import {
  TransactionSkeleton,
  HeaderSkeleton,
} from "@/components/general-transaction/list/Skeletons";
import { DebugConsole } from "@/components/shared/utils";
import {
  initConsoleCapture,
  getCaptureLogs,
  getCaptureErrors,
  addCustomLog,
} from "@/utils/debug";
import { Skeleton } from "@/components/shared/ui";

// LIFF 類型聲明
declare global {
  interface Window {
    liff: any; // LIFF SDK interface
  }
}

// 帳本類型定義
interface AccountBook {
  id: string;
  name: string;
  summary: {
    totalExpense: number;
    totalIncome: number;
    balance: number;
  };
}

export default function Home() {
  const router = useRouter();
  const [isLiffInitialized, setIsLiffInitialized] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"general" | "fixed">("general");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalExpense: 0,
    totalIncome: 0,
    balance: 0,
  });
  // 帳本相關狀態
  const [accountBooks, setAccountBooks] = useState<AccountBook[]>([
    {
      id: "default",
      name: "默认账本",
      summary: { totalExpense: 0, totalIncome: 0, balance: 0 },
    },
  ]);
  const [currentAccountBook, setCurrentAccountBook] =
    useState<string>("default");
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);

  // 初始化控制台捕獲
  useEffect(() => {
    initConsoleCapture();
    addCustomLog("應用程式已啟動，控制台捕獲已初始化");
  }, []);

  // 添加鍵盤事件監聽器，按 O 鍵顯示調試信息
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "o" || event.key === "O") {
        setShowDebug((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 更新日誌顯示
  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(getCaptureLogs());
      setErrorLogs(getCaptureErrors());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 初始化 LIFF 和获取用戶ID
  useEffect(() => {
    const initLiff = async () => {
      try {
        // 檢測是否在 LINE 內部瀏覽器中
        const isInLineInternalBrowser =
          typeof window !== "undefined" &&
          window.navigator.userAgent.includes("Line") &&
          !window.navigator.userAgent.includes("LIFF");

        console.log("Is in LINE internal browser:", isInLineInternalBrowser);

        // 初始化 LIFF
        const isInitialized = await initializeLiff();
        setIsLiffInitialized(isInitialized);

        if (!isInitialized) {
          console.error("LIFF 初始化失敗");
          setError("LINE應用程式初始化失敗，請重新載入頁面");
          setShowDebug(true);
          return;
        }

        // 檢查LIFF對象是否可用
        if (
          typeof window === "undefined" ||
          !window.liff ||
          typeof window.liff !== "object"
        ) {
          console.error("LIFF object is not available after initialization");
          setError("LIFF 對象不可用，請重新載入頁面");
          setShowDebug(true);
          return;
        }

        // 如果在 LINE 內部瀏覽器中，跳過登入檢查
        if (isInLineInternalBrowser) {
          console.log("In LINE internal browser, skipping login check");
          // 嘗試從 localStorage 獲取用戶 ID
          const storedUserId = localStorage.getItem("userId");
          if (storedUserId) {
            console.log("Using stored user ID:", storedUserId);
            setUserId(storedUserId);
            addCustomLog(`使用存儲的用戶 ID: ${storedUserId}`);

            // 載入存儲的當前帳本
            const storedAccountBook =
              localStorage.getItem("currentAccountBook");
            if (storedAccountBook) {
              setCurrentAccountBook(storedAccountBook);
              console.log("Using stored account book:", storedAccountBook);
            }

            // 直接設置 LIFF 初始化完成，以便開始獲取數據
            setIsLiffInitialized(true);
            return;
          } else {
            console.log("No stored user ID found in localStorage");

            // 嘗試從 LIFF context 獲取用戶 ID
            try {
              if (window.liff && typeof window.liff.getContext === "function") {
                const context = await window.liff.getContext();
                console.log("LIFF Context for user ID:", context);

                if (context && context.userId) {
                  console.log("Found user ID in LIFF context:", context.userId);
                  setUserId(context.userId);
                  localStorage.setItem("userId", context.userId);
                  addCustomLog(
                    `從 LIFF context 獲取用戶 ID: ${context.userId}`
                  );
                  setIsLiffInitialized(true);
                  return;
                }
              }
            } catch (contextError) {
              console.error("Error getting LIFF context:", contextError);
            }

            // 如果沒有存儲的用戶 ID，顯示提示
            setError("請先在 LINE 應用程式中登入");
            setShowDebug(true);
            return;
          }
        }

        // 安全檢查 isLoggedIn 方法是否存在
        if (typeof window.liff.isLoggedIn !== "function") {
          console.error("window.liff.isLoggedIn is not a function");
          setError("LIFF 功能不可用，請重新載入頁面");
          setShowDebug(true);
          return;
        }

        // 檢查是否已登入
        if (!window.liff.isLoggedIn()) {
          // 如果未登入，則導向登入
          console.log("用戶未登入，導向登入頁面");
          login();
          return;
        }

        // 用戶已登入，獲取用戶資料
        try {
          // 先檢查 access token 是否有效
          try {
            // 安全檢查 getAccessToken 方法是否存在
            if (typeof window.liff.getAccessToken !== "function") {
              console.error("window.liff.getAccessToken is not a function");
              throw new Error("LIFF getAccessToken method is not available");
            }

            const token = window.liff.getAccessToken();
            if (!token) {
              console.log("Access token 不存在，重新登入");
              login();
              return;
            }
            console.log("Access token 存在，繼續獲取用戶資料");
          } catch (tokenError) {
            console.error("獲取 access token 失敗，可能已過期", tokenError);
            console.log("嘗試重新登入");
            login();
            return;
          }

          // 安全檢查 getProfile 方法是否存在
          if (typeof window.liff.getProfile !== "function") {
            console.error("window.liff.getProfile is not a function");
            throw new Error("LIFF getProfile method is not available");
          }

          const profile = await window.liff.getProfile();
          console.log("成功獲取用戶資料:", profile);

          if (profile && profile.userId) {
            setUserId(profile.userId);
            // 存儲用戶 ID 到 localStorage
            try {
              localStorage.setItem("userId", profile.userId);
              console.log("Saved user ID to localStorage:", profile.userId);

              // 載入存儲的當前帳本
              const storedAccountBook =
                localStorage.getItem("currentAccountBook");
              if (storedAccountBook) {
                setCurrentAccountBook(storedAccountBook);
                console.log("Using stored account book:", storedAccountBook);
              }
            } catch (storageError) {
              console.error(
                "Failed to save user ID to localStorage:",
                storageError
              );
            }
            console.log("用戶 LINE ID:", profile.userId);
            console.log("用戶名稱:", profile.displayName);
          } else {
            throw new Error("無法獲取用戶資料");
          }
        } catch (profileError) {
          console.error("獲取用戶資料失敗", profileError);

          // 檢查是否是 token 過期錯誤
          if (
            profileError instanceof Error &&
            profileError.message &&
            (profileError.message.includes("expired") ||
              profileError.message.includes("token"))
          ) {
            console.log("Access token 已過期，嘗試重新登入");
            // 嘗試重新登入
            try {
              login();
              return;
            } catch (loginError) {
              console.error("重新登入失敗", loginError);
            }
          }

          setError("無法獲取用戶資料，請確保您已登入LINE並授權應用程式");
          setShowDebug(true);
        }
      } catch (error) {
        console.error("LIFF 初始化失敗", error);
        setError("LINE應用程式初始化失敗，請重新載入頁面或確認您的網路連接");
        setShowDebug(true);
      }
    };

    initLiff();
  }, []);

  // 獲取帳本列表
  const fetchAccountBooks = useCallback(async () => {
    if (!userId) return;

    try {
      // 從數據庫獲取帳本列表
      const accountBooks = await fetchUserAccountBooks(userId);

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      // 並行獲取所有帳本的摘要
      const summaries = await Promise.all(
        accountBooks.map(async (book) => {
          const summary = await fetchAccountBookMonthlySummary(
            userId,
            book.id,
            year,
            month
          );
          return {
            id: book.id,
            name: book.name,
            summary,
          };
        })
      );

      console.log(`成功獲取 ${summaries.length} 個帳本摘要`);
      setAccountBooks(summaries);

      // 設定當前帳本的摘要
      const currentBook = summaries.find(
        (book) => book.id === currentAccountBook
      );
      if (currentBook) {
        setSummary(currentBook.summary);
      } else if (summaries.length > 0) {
        // 如果當前帳本不存在，設置為默認帳本
        setCurrentAccountBook(summaries[0].id);
        setSummary(summaries[0].summary);
        localStorage.setItem("currentAccountBook", summaries[0].id);
      }
    } catch (error) {
      console.error("獲取帳本列表失敗", error);
    }
  }, [userId, currentDate, currentAccountBook]);

  // 定義獲取數據的函數
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsDataLoading(true);
    setError(null);

    if (!userId) {
      console.log("No user ID available, cannot fetch data");
      setIsLoading(false);
      setIsDataLoading(false);
      return;
    }

    try {
      console.log(
        `開始獲取用戶 ${userId} 的交易數據，日期: ${currentDate.toISOString()}`
      );

      // 獲取所選月份的交易數據
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // JavaScript 月份從 0 開始，API需要 1-12

      // 並行獲取交易數據和帳本列表
      await Promise.all([
        fetchTransactionsByUser(userId, year, month).then((data) => {
          console.log(`成功獲取 ${data.length} 筆交易數據`);

          // 輸出每個交易的帳本信息以進行調試
          console.log("=== 交易帳本調試信息 ===");
          data.forEach((tx, index) => {
            console.log(`交易 ${index + 1} (ID: ${tx.id}):`);
            console.log(`  - 類型: ${tx.type}, 金額: ${tx.amount}`);
            console.log(`  - 帳本ID: "${tx.accountBook || "未設置"}"`);
            console.log(`  - 日期: ${tx.date}`);
          });
          console.log("========================");

          // 統計各帳本交易數量以便調試
          const accountBookStats: { [key: string]: number } = {};
          data.forEach((tx) => {
            const book = tx.accountBook || "unknown";
            accountBookStats[book] = (accountBookStats[book] || 0) + 1;
          });
          console.log(`各帳本交易統計:`, accountBookStats);

          // 根據當前選中的帳本過濾交易
          console.log(`當前選擇的帳本: ${currentAccountBook}`);

          // 簡化過濾邏輯
          if (currentAccountBook === "default") {
            // 帳目總覽：顯示所有交易
            console.log(`帳目總覽顯示所有 ${data.length} 筆交易`);
            setTransactions(data);
          } else {
            // 特定帳本：按ID過濾
            console.log(`開始篩選帳本 ${currentAccountBook} 的交易`);
            const filteredData = data.filter(
              (tx) => tx.accountBook === currentAccountBook
            );
            console.log(
              `篩選結果: ${filteredData.length}/${data.length} 筆交易`
            );

            // 調試：檢查所有交易的帳本字段
            if (filteredData.length === 0) {
              console.log(
                `警告: 帳本 ${currentAccountBook} 沒有交易，檢查所有交易的 accountBook 字段:`
              );
              data.forEach((tx, i) => {
                if (i < 10) {
                  console.log(
                    `交易 ${tx.id}: accountBook = "${
                      tx.accountBook || "未設置"
                    }"`
                  );
                }
              });
            }

            setTransactions(filteredData);
          }
        }),
        fetchAccountBooks(),
      ]);
    } catch (error) {
      console.error("獲取交易數據失敗", error);
      setError("獲取數據失敗，請稍後再試");
      setTransactions([]);
      setShowDebug(true);
    } finally {
      setIsLoading(false);
      setIsDataLoading(false);
    }
  }, [userId, currentDate, currentAccountBook, fetchAccountBooks]);

  // 每次組件掛載或獲得焦點時刷新數據
  useEffect(() => {
    // 初始加載
    if (userId) {
      fetchData();
    }

    // 添加頁面可見性變化事件監聽器
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && userId) {
        console.log("頁面重新獲得焦點，刷新數據");
        fetchData();
      }
    };

    // 添加頁面焦點事件監聽器
    const handleFocus = () => {
      if (userId) {
        console.log("頁面重新獲得焦點，刷新數據");
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [userId, fetchData, currentDate]);

  // 當月份變化時重新獲取數據
  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [currentDate, userId, fetchData]);

  const handleMonthChange = (newDate: Date) => {
    console.log(`切換月份至: ${newDate.toISOString()}`);
    setCurrentDate(newDate);
  };

  const handleTabChange = (tab: "general" | "fixed") => {
    console.log(`切換標籤至: ${tab}`);
    setActiveTab(tab);
  };

  // 處理交易點擊，使用 LIFF 導航
  const handleTransactionClick = (id: string) => {
    // 清除緩存，確保從詳情頁返回時能獲取最新數據
    if (userId) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      clearTransactionCache(userId, year, month);
    }

    console.log(`點擊交易: id=${id}`);

    // 使用 LIFF 導航而不是 Next.js 路由，傳遞當前選擇的帳本信息
    navigateInLiff("/transaction", { id, accountBook: currentAccountBook });
  };

  // 處理帳本切換
  const handleAccountBookChange = (accountBookId: string) => {
    console.log(`切換帳本至: ${accountBookId}`);
    console.log(`目前有 ${accountBooks.length} 個帳本可選`);
    accountBooks.forEach((book) => {
      console.log(
        `帳本: ${book.id} - ${book.name}, 餘額: ${book.summary.balance}`
      );
    });

    // 如果選擇了與當前相同的帳本，無需操作
    if (accountBookId === currentAccountBook) {
      console.log(`已經在 ${accountBookId} 帳本中，無需切換`);
      return;
    }

    setCurrentAccountBook(accountBookId);

    // 儲存目前選中的帳本到 localStorage
    localStorage.setItem("currentAccountBook", accountBookId);

    // 更新摘要數據到當前選中的帳本
    const selectedBook = accountBooks.find((book) => book.id === accountBookId);
    if (selectedBook) {
      setSummary(selectedBook.summary);
      console.log(`已更新摘要到帳本: ${selectedBook.name}`);
    } else {
      console.warn(`找不到 ID 為 ${accountBookId} 的帳本`);
    }

    // 清除緩存，確保獲取最新數據
    if (userId) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      try {
        // 清除交易緩存
        clearTransactionCache(userId, year, month);
        console.log(`已清除 ${year}年${month}月 的交易緩存`);

        // 清除帳本緩存
        sessionStorage.removeItem(`account_books_${userId}`);
        console.log(`已清除帳本列表緩存`);

        // 清除帳本摘要緩存
        sessionStorage.removeItem(
          `summary_${userId}_${accountBookId}_${year}_${month}`
        );
        console.log(`已清除帳本 ${accountBookId} 的摘要緩存`);
      } catch (error) {
        console.error("清除緩存失敗", error);
      }
    }

    // 重新獲取交易數據，根據選中的帳本過濾
    console.log(`開始重新獲取數據`);
    setIsLoading(true);
    setIsDataLoading(true);
    if (userId) {
      fetchData();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <main className="flex-1 container max-w-md mx-auto px-5 py-4">
        {!isLiffInitialized || !userId ? (
          <div className="flex flex-col h-[80vh] justify-center items-center">
            {error && (
              <div className="flex flex-col items-center mt-6 space-y-4">
                <div className="p-4 bg-red-50 text-red-500 rounded-xl text-center">
                  {error}
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  重新載入
                </button>

                {showDebug && (
                  <DebugConsole
                    logs={logs}
                    errors={errorLogs}
                    title="LIFF 初始化調試信息"
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <MonthSelector
              currentDate={currentDate}
              onMonthChange={handleMonthChange}
            />

            <MonthSummary
              currentDate={currentDate}
              summary={summary}
              isLoading={isDataLoading}
              accountBooks={accountBooks}
              onAccountBookChange={handleAccountBookChange}
              currentAccountBook={currentAccountBook}
            />

            <TabSelector activeTab={activeTab} onTabChange={handleTabChange} />

            {error ? (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-red-50 text-red-500 rounded-xl text-center">
                  {error}
                </div>

                {showDebug && (
                  <DebugConsole
                    logs={logs}
                    errors={errorLogs}
                    title="數據載入調試信息"
                  />
                )}
              </div>
            ) : (
              <>
                <TransactionList
                  transactions={transactions}
                  currentDate={currentDate}
                  activeTab={activeTab}
                  isLoading={isLoading}
                  onTransactionClick={handleTransactionClick}
                  showDebugInfo={showDebug}
                  userId={userId}
                  onTransactionUpdate={async (
                    updatedTransactions: Transaction[]
                  ) => {
                    console.log("onTransactionUpdate 被調用，開始更新數據...");

                    // 清除快取
                    if (userId) {
                      const year = currentDate.getFullYear();
                      const month = currentDate.getMonth() + 1;
                      console.log(
                        `清除用戶 ${userId} 的 ${year}-${month} 快取數據`
                      );
                      clearTransactionCache(userId, year, month);
                    }

                    // 重新獲取數據
                    setIsLoading(true);
                    console.log("設置載入狀態為 true");

                    try {
                      // 重新獲取所有數據，包括交易和帳本
                      await fetchData();
                    } catch (error) {
                      console.error("Error fetching updated data:", error);
                    } finally {
                      console.log("設置載入狀態為 false");
                      setIsLoading(false);
                    }
                  }}
                  currentAccountBook={currentAccountBook}
                />

                {showDebug && (
                  <DebugConsole
                    logs={logs}
                    errors={errorLogs}
                    title="應用調試信息"
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Small debug indicator */}
      {showDebug && (
        <div className="fixed bottom-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded-full opacity-70">
          Debug Mode
        </div>
      )}
    </div>
  );
}
