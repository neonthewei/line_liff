"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initializeLiff, navigateInLiff } from "@/utils/liff";
import type { Transaction } from "@/types/transaction";
import MonthSelector from "@/components/month-selector";
import { fetchTransactionsByUser, fetchMonthlySummary } from "@/utils/api";
import MonthSummary from "@/components/month-summary";
import TabSelector from "@/components/tab-selector";
import TransactionList from "@/components/transaction-list";
import DebugConsole from "@/components/debug-console";
import { initConsoleCapture, getCaptureLogs, getCaptureErrors, addCustomLog } from "@/utils/debug";

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
    const intervalId = setInterval(() => {
      setLogs(getCaptureLogs());
      setErrorLogs(getCaptureErrors());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // 初始化 LIFF 和获取用戶ID
  useEffect(() => {
    const initLiff = async () => {
      try {
        // 初始化 LIFF
        const isInitialized = await initializeLiff();
        setIsLiffInitialized(isInitialized);
        
        if (!isInitialized) {
          throw new Error("LIFF 初始化失敗");
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

  // 获取交易数据
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      if (!userId) {
        setIsLoading(false);
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
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId, currentDate]);

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
    console.log(`點擊交易: id=${id}, type=${type}`);
    
    // 使用 LIFF 導航而不是 Next.js 路由
    navigateInLiff("/transaction", { id, type });
  };

  // 切換調試控制台顯示
  const toggleDebugConsole = () => {
    setShowDebug(!showDebug);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <main className="flex-1 container max-w-md mx-auto px-5 py-4">
        {!isLiffInitialized || !userId ? (
          <div className="flex flex-col items-center justify-center h-[80vh]">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 text-center">
              {error || "正在連接到LINE，請稍候..."}
            </p>
            <div className="flex flex-col items-center mt-4 space-y-2">
              {error && (
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  重新載入
                </button>
              )}
              <button 
                onClick={toggleDebugConsole}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                {showDebug ? "隱藏調試信息" : "顯示調試信息"}
              </button>
            </div>
            
            {showDebug && (
              <DebugConsole 
                logs={logs} 
                errors={errorLogs} 
                title="LIFF 初始化調試信息" 
              />
            )}
          </div>
        ) : (
          <>
            <MonthSelector currentDate={currentDate} onMonthChange={handleMonthChange} />

            <MonthSummary 
              currentDate={currentDate} 
              summary={summary} 
              isLoading={isLoading} 
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
                  isLoading={isLoading}
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
