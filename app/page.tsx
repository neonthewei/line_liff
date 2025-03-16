"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { initializeLiff, navigateInLiff } from "@/utils/liff";
import type { Transaction } from "@/types/transaction";
import MonthSelector from "@/components/month-selector";
import { fetchTransactionsByUser, fetchMonthlySummary, clearTransactionCache } from "@/utils/api";
import MonthSummary from "@/components/month-summary";
import TabSelector from "@/components/tab-selector";
import TransactionList from "@/components/transaction-list";
import DebugConsole from "@/components/debug-console";
import { initConsoleCapture, getCaptureLogs, getCaptureErrors, addCustomLog } from "@/utils/debug";
import { Skeleton } from "@/components/ui/skeleton";

// LIFF 類型聲明
declare global {
  interface Window {
    liff: any; // LIFF SDK interface
  }
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
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 初始化控制台捕獲
  useEffect(() => {
    initConsoleCapture();
    addCustomLog("應用程式已啟動，控制台捕獲已初始化");
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
        const isInLineInternalBrowser = typeof window !== 'undefined' && 
          window.navigator.userAgent.includes('Line') && 
          !window.navigator.userAgent.includes('LIFF');
        
        console.log("Is in LINE internal browser:", isInLineInternalBrowser);
        
        // 初始化 LIFF
        const isInitialized = await initializeLiff();
        setIsLiffInitialized(isInitialized);
        
        if (!isInitialized) {
          throw new Error("LIFF 初始化失敗");
        }
        
        // 如果在 LINE 內部瀏覽器中，跳過登入檢查
        if (isInLineInternalBrowser) {
          console.log("In LINE internal browser, skipping login check");
          // 嘗試從 localStorage 獲取用戶 ID
          const storedUserId = localStorage.getItem('userId');
          if (storedUserId) {
            console.log("Using stored user ID:", storedUserId);
            setUserId(storedUserId);
            addCustomLog(`使用存儲的用戶 ID: ${storedUserId}`);
            
            // 直接設置 LIFF 初始化完成，以便開始獲取數據
            setIsLiffInitialized(true);
            return;
          } else {
            console.log("No stored user ID found in localStorage");
            
            // 嘗試從 LIFF context 獲取用戶 ID
            try {
              if (window.liff && typeof window.liff.getContext === 'function') {
                const context = window.liff.getContext();
                console.log("LIFF Context for user ID:", context);
                
                if (context && context.userId) {
                  console.log("Found user ID in LIFF context:", context.userId);
                  setUserId(context.userId);
                  localStorage.setItem('userId', context.userId);
                  addCustomLog(`從 LIFF context 獲取用戶 ID: ${context.userId}`);
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
        
        // 檢查是否已登入
        if (!window.liff.isLoggedIn()) {
          // 如果未登入，則導向登入
          console.log("用戶未登入，導向登入頁面");
          window.liff.login();
          return;
        }
        
        // 用戶已登入，獲取用戶資料
        try {
          // 先檢查 access token 是否有效
          try {
            const token = window.liff.getAccessToken();
            if (!token) {
              console.log("Access token 不存在，重新登入");
              window.liff.login();
              return;
            }
            console.log("Access token 存在，繼續獲取用戶資料");
          } catch (tokenError) {
            console.error("獲取 access token 失敗，可能已過期", tokenError);
            console.log("嘗試重新登入");
            window.liff.login();
            return;
          }
          
          const profile = await window.liff.getProfile();
          console.log("成功獲取用戶資料:", profile);
          
          if (profile && profile.userId) {
            setUserId(profile.userId);
            // 存儲用戶 ID 到 localStorage
            try {
              localStorage.setItem('userId', profile.userId);
              console.log("Saved user ID to localStorage:", profile.userId);
            } catch (storageError) {
              console.error("Failed to save user ID to localStorage:", storageError);
            }
            console.log("用戶 LINE ID:", profile.userId);
            console.log("用戶名稱:", profile.displayName);
          } else {
            throw new Error("無法獲取用戶資料");
          }
        } catch (profileError) {
          console.error("獲取用戶資料失敗", profileError);
          
          // 檢查是否是 token 過期錯誤
          if (profileError instanceof Error && 
              profileError.message && 
              (profileError.message.includes("expired") || 
               profileError.message.includes("token"))) {
            console.log("Access token 已過期，嘗試重新登入");
            // 嘗試重新登入
            try {
              window.liff.login();
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
      console.log(`開始獲取用戶 ${userId} 的交易數據，日期: ${currentDate.toISOString()}`);
      
      // 獲取所選月份的交易數據
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // JavaScript 月份從 0 開始，API需要 1-12
      
      // 並行獲取交易數據和月度摘要
      const [transactionsData, summaryData] = await Promise.all([
        fetchTransactionsByUser(userId, year, month),
        fetchMonthlySummary(userId, year, month)
      ]);
      
      console.log(`成功獲取 ${transactionsData.length} 筆交易數據`);
      setTransactions(transactionsData);
      setSummary(summaryData);
    } catch (error) {
      console.error("獲取交易數據失敗", error);
      setError("獲取數據失敗，請稍後再試");
      setTransactions([]);
      setShowDebug(true);
    } finally {
      setIsLoading(false);
      setIsDataLoading(false);
    }
  }, [userId, currentDate]);

  // 每次組件掛載或獲得焦點時刷新數據
  useEffect(() => {
    // 初始加載
    if (userId) {
      fetchData();
    }

    // 添加頁面可見性變化事件監聽器
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId) {
        console.log('頁面重新獲得焦點，刷新數據');
        fetchData();
      }
    };

    // 添加頁面焦點事件監聽器
    const handleFocus = () => {
      if (userId) {
        console.log('頁面重新獲得焦點，刷新數據');
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
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
    if (isCollapsed) {
      setIsCollapsed(false);
    }
  };

  // 處理收起/展開明細
  const handleToggleCollapse = () => {
    console.log(`${isCollapsed ? "展開" : "收起"}明細`);
    setIsCollapsed(!isCollapsed);
  };

  // 處理交易點擊，使用 LIFF 導航
  const handleTransactionClick = (id: string, type: string) => {
    // 只記錄點擊，不執行任何可能阻塞導航的操作
    console.log(`點擊交易: id=${id}, type=${type}`);
    
    // 不再調用 navigateInLiff，因為現在使用 <a> 標籤直接導航
    // 也不再清除緩存，因為這可能會導致頁面重新渲染
    
    // 在返回頁面時，我們將依靠頁面的 visibilitychange 和 focus 事件來刷新數據
  };

  // 切換調試控制台顯示
  const toggleDebugConsole = () => {
    setShowDebug(!showDebug);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <main className="flex-1 container max-w-md mx-auto px-5 py-4">
        {!isLiffInitialized || !userId ? (
          <div className="flex flex-col h-[80vh]">
            <div className="py-4">
              <Skeleton className="h-10 w-full rounded-xl mb-5 animate-pulse-color" />
            </div>
            
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
              <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-6 w-32 animate-pulse-color" />
                <Skeleton className="h-6 w-24 animate-pulse-color" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center">
                  <Skeleton className="h-4 w-16 mb-2 animate-pulse-color" />
                  <Skeleton className="h-6 w-20 animate-pulse-color" />
                </div>
                <div className="flex flex-col items-center">
                  <Skeleton className="h-4 w-16 mb-2 animate-pulse-color" />
                  <Skeleton className="h-6 w-20 animate-pulse-color" />
                </div>
                <div className="flex flex-col items-center">
                  <Skeleton className="h-4 w-16 mb-2 animate-pulse-color" />
                  <Skeleton className="h-6 w-20 animate-pulse-color" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-2 mb-5 shadow-sm">
              <Skeleton className="h-10 w-full rounded-xl animate-pulse-color" />
            </div>
            
            <div className="space-y-4">
              {[1, 2, 3].map((group) => (
                <div key={`skeleton-group-${group}`} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center px-5 py-3 border-b">
                    <Skeleton className="h-5 w-24 animate-pulse-color" />
                    <Skeleton className="h-4 w-16 animate-pulse-color" />
                  </div>
                  <div className="divide-y divide-gray-100">
                    {[1, 2, 3].map((item) => (
                      <div key={`skeleton-item-${group}-${item}`} className="px-4 py-3 flex items-center justify-between">
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
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {error && (
              <div className="flex flex-col items-center mt-6 space-y-2">
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  重新載入
                </button>
                <button 
                  onClick={toggleDebugConsole}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {showDebug ? "隱藏調試信息" : "顯示調試信息"}
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
            <MonthSelector currentDate={currentDate} onMonthChange={handleMonthChange} />

            <MonthSummary 
              currentDate={currentDate} 
              summary={summary} 
              isLoading={isDataLoading} 
            />

            <TabSelector 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
              onToggleCollapse={handleToggleCollapse}
              isCollapsed={isCollapsed}
            />

            {error ? (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-red-50 text-red-500 rounded-xl text-center">
                  {error}
                </div>
                <button 
                  onClick={toggleDebugConsole}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {showDebug ? "隱藏調試信息" : "顯示調試信息"}
                </button>
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
                  isLoading={isDataLoading}
                  isCollapsed={isCollapsed}
                  onTransactionClick={handleTransactionClick}
                />
                <div className="mt-8 text-center">
                  <button 
                    onClick={toggleDebugConsole}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  >
                    {showDebug ? "隱藏調試信息" : "顯示調試信息"}
                  </button>
                  {showDebug && (
                    <DebugConsole 
                      logs={logs} 
                      errors={errorLogs} 
                      title="應用調試信息" 
                    />
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
