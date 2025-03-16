"use client";

import { useEffect, useState, useMemo, useCallback, Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import { initializeLiff } from "@/utils/liff";
import type { Transaction } from "@/types/transaction";
import MonthSelector from "@/components/month-selector";
import { fetchTransactionsByUser, fetchMonthlySummary } from "@/utils/api";
import { initConsoleCapture, getCaptureLogs, getCaptureErrors, addCustomLog } from "@/utils/debug";
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

// 懶加載圖表組件
const ChartComponents = lazy(() => import('@/components/chart-components'));

// LIFF 類型聲明
declare global {
  interface Window {
    liff: any; // LIFF SDK interface
  }
}

// 分析頁面的標籤類型
type AnalysisTab = "expense" | "income";

// 圓餅圖的顏色
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#4CAF50', '#9C27B0', '#F44336'];

// 緩存數據的有效期（毫秒）
const CACHE_EXPIRY = 5 * 60 * 1000; // 5分鐘

// 緩存鍵生成函數
const generateCacheKey = (userId: string, year: number, month: number) => 
  `transactions_${userId}_${year}_${month}`;

export default function AnalysePage() {
  const router = useRouter();
  const [isLiffInitialized, setIsLiffInitialized] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<AnalysisTab>("expense");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalExpense: 0,
    totalIncome: 0,
    balance: 0,
    averageExpense: 0,
    averageIncome: 0,
    averageBalance: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [dataTimestamp, setDataTimestamp] = useState<number>(0);
  const [chartsLoaded, setChartsLoaded] = useState(false);

  // 初始化控制台捕獲
  useEffect(() => {
    initConsoleCapture();
    addCustomLog("分析頁面已啟動，控制台捕獲已初始化");
  }, []);

  // 延遲加載圖表
  useEffect(() => {
    // 使用 requestIdleCallback 在瀏覽器空閒時加載圖表
    const loadCharts = () => {
      setChartsLoaded(true);
    };

    if ('requestIdleCallback' in window) {
      // @ts-ignore
      window.requestIdleCallback(loadCharts, { timeout: 2000 });
    } else {
      // 降級處理：使用 setTimeout
      setTimeout(loadCharts, 200);
    }

    return () => {
      if ('cancelIdleCallback' in window && chartsLoaded === false) {
        // @ts-ignore
        window.cancelIdleCallback(loadCharts as any);
      }
    };
  }, []);

  // 初始化 LIFF - 使用 useCallback 優化
  const initLiff = useCallback(async () => {
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
        const profile = await window.liff.getProfile();
        setUserId(profile.userId);
        addCustomLog(`用戶已登入: ${profile.userId}`);
      } catch (profileErr) {
        console.error("獲取用戶資料失敗:", profileErr);
        setError("獲取用戶資料失敗");
      }
    } catch (err) {
      console.error("LIFF 初始化錯誤:", err);
      setError("LIFF 初始化失敗");
    }
  }, []);

  // 初始化 LIFF
  useEffect(() => {
    initLiff();
  }, [initLiff]);

  // 從緩存獲取數據或從API獲取
  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // 獲取當月交易
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      addCustomLog(`正在獲取 ${year}年${month}月 的交易數據`);
      
      // 檢查緩存
      const cacheKey = generateCacheKey(userId, year, month);
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { transactions: cachedTransactions, summary: cachedSummary, timestamp } = JSON.parse(cachedData);
        
        // 檢查緩存是否過期
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          addCustomLog(`使用緩存數據: ${cachedTransactions.length} 筆交易`);
          setTransactions(cachedTransactions);
          setSummary(cachedSummary);
          setDataTimestamp(timestamp);
          setIsLoading(false);
          return;
        }
      }
      
      // 緩存不存在或已過期，從API獲取數據
      const transactionsData = await fetchTransactionsByUser(userId, year, month);
      
      // 獲取月度摘要
      const summaryData = await fetchMonthlySummary(userId, year, month);
      
      // 計算平均值 (假設一個月30天)
      const daysInMonth = new Date(year, month, 0).getDate();
      const averageExpense = summaryData.totalExpense / daysInMonth;
      const averageIncome = summaryData.totalIncome / daysInMonth;
      const averageBalance = summaryData.balance / daysInMonth;
      
      const fullSummary = {
        ...summaryData,
        averageExpense,
        averageIncome,
        averageBalance
      };
      
      // 更新狀態
      setTransactions(transactionsData);
      setSummary(fullSummary);
      
      // 更新緩存
      const now = Date.now();
      setDataTimestamp(now);
      localStorage.setItem(cacheKey, JSON.stringify({
        transactions: transactionsData,
        summary: fullSummary,
        timestamp: now
      }));
      
      addCustomLog(`成功獲取並緩存 ${transactionsData.length} 筆交易數據`);
    } catch (err) {
      console.error("獲取數據錯誤:", err);
      setError("獲取數據失敗");
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentDate]);

  // 獲取交易數據
  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, currentDate, fetchData]);

  // 使用 useMemo 優化圖表數據處理
  const { memoizedCategoryData, memoizedDailyData } = useMemo(() => {
    if (transactions.length === 0) {
      return { memoizedCategoryData: [], memoizedDailyData: [] };
    }
    
    // 根據當前標籤過濾交易
    let filteredTransactions = transactions;
    
    if (activeTab === "expense") {
      filteredTransactions = transactions.filter(tx => tx.type === "expense");
    } else if (activeTab === "income") {
      filteredTransactions = transactions.filter(tx => tx.type === "income");
    }
    
    // 生成圓餅圖數據 (按類別分組)
    const categoryGroups: Record<string, number> = {};
    
    filteredTransactions.forEach(tx => {
      // 確保類別不為空，如果為空則使用"未分類"
      const category = tx.category || "未分類";
      // 確保金額是數字
      const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount || 0));
      
      if (!categoryGroups[category]) {
        categoryGroups[category] = 0;
      }
      
      categoryGroups[category] += Math.abs(amount); // 使用絕對值確保金額為正數
    });
    
    // 轉換為圓餅圖數據格式，並按金額降序排序
    const pieData = Object.keys(categoryGroups)
      .map(category => ({
        name: category,
        value: categoryGroups[category]
      }))
      .filter(item => item.value > 0) // 過濾掉值為0的項目
      .sort((a, b) => b.value - a.value); // 按金額降序排序
    
    // 生成線圖數據 (按日期分組)
    const dailyGroups: Record<string, number> = {};
    
    // 初始化當月所有日期
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${i}日`;
      dailyGroups[dateStr] = 0;
    }
    
    // 累加每日數據
    filteredTransactions.forEach(tx => {
      try {
        // 從 "YYYY年MM月DD日" 格式解析日期
        const match = tx.date.match(/(\d+)年(\d+)月(\d+)日/);
        if (match) {
          const day = parseInt(match[3]);
          const dateStr = `${day}日`;
          // 確保金額是數字
          const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount || 0));
          
          if (dailyGroups[dateStr] !== undefined) {
            dailyGroups[dateStr] += Math.abs(amount); // 使用絕對值確保金額為正數
          }
        }
      } catch (error) {
        console.error("日期解析錯誤:", error, tx.date);
      }
    });
    
    // 轉換為圖表數據格式
    const lineData = Object.keys(dailyGroups)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(day => {
        const amount = dailyGroups[day];
        const totalForActiveTab = activeTab === "expense" 
          ? summary.totalExpense 
          : summary.totalIncome;
        
        // 避免除以零
        const percentage = totalForActiveTab > 0 ? (amount / totalForActiveTab * 100) : 0;
        
        return {
          day,
          amount,
          percentage
        };
      });
    
    return { 
      memoizedCategoryData: pieData, 
      memoizedDailyData: lineData 
    };
  }, [transactions, activeTab, summary, currentDate]);

  // 更新圖表數據
  useEffect(() => {
    setCategoryData(memoizedCategoryData);
    setDailyData(memoizedDailyData);
  }, [memoizedCategoryData, memoizedDailyData]);

  // 處理月份變更
  const handleMonthChange = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  // 處理標籤變更
  const handleTabChange = useCallback((tab: AnalysisTab) => {
    setActiveTab(tab);
  }, []);

  // 自定義工具提示
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-md border border-gray-200">
          <p className="font-medium text-gray-700">{label}</p>
          <p className="text-green-500 font-medium text-lg">
            {payload[0].value.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {activeTab === "expense" ? "佔總支出" : "佔總收入"}
          </p>
        </div>
      );
    }
    return null;
  };

  // 渲染骨架屏
  const renderSkeleton = () => (
    <>
      <div className="bg-white rounded-2xl p-4 mb-5 shadow-sm">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48 mb-3" />
        <div className="flex justify-center items-center">
          <Skeleton className="h-[300px] w-[300px] rounded-full" />
        </div>
        <div className="mt-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Skeleton className="w-3 h-3 rounded mr-2" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48 mb-3" />
        <Skeleton className="h-[200px] w-full mb-4" />
        <div className="mt-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-2">
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-4 w-12 mb-1" />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <main className="container mx-auto max-w-md p-5 min-h-screen">
      {/* 月份選擇器 */}
      <MonthSelector currentDate={currentDate} onMonthChange={handleMonthChange} />

      {/* 標籤選擇器 */}
      <div className="flex bg-white rounded-2xl p-2 mb-5 shadow-sm">
        <div className="flex w-full relative">
          {/* 兩個按鈕的容器 */}
          <div className="flex w-full rounded-xl overflow-hidden">
            {/* 綠色背景區塊 - 固定位置，使用動畫 */}
            <div 
              className={`absolute top-0 bottom-0 w-1/2 rounded-xl bg-green-500 transition-transform duration-300 ease-in-out ${
                activeTab === "expense" 
                  ? "left-0" 
                  : "translate-x-full"
              }`}
            />
            
            {/* 按鈕 - 文字始終保持粗體，只改變顏色 */}
            <button
              className={`w-1/2 py-2.5 text-center text-base relative z-10 transition-colors duration-300 ease-in-out font-medium ${
                activeTab === "expense" ? "text-white" : "text-gray-600"
              }`}
              onClick={() => handleTabChange("expense")}
              aria-label="支出標籤"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleTabChange("expense")}
            >
              支出
            </button>
            <button
              className={`w-1/2 py-2.5 text-center text-base relative z-10 transition-colors duration-300 ease-in-out font-medium ${
                activeTab === "income" ? "text-white" : "text-gray-600"
              }`}
              onClick={() => handleTabChange("income")}
              aria-label="收入標籤"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleTabChange("income")}
            >
              收入
            </button>
          </div>
        </div>
      </div>

      {/* 圖表區域 */}
      {isLoading ? (
        renderSkeleton()
      ) : (
        <Suspense fallback={renderSkeleton()}>
          {chartsLoaded ? (
            <ChartComponents 
              categoryData={categoryData}
              dailyData={dailyData}
              activeTab={activeTab}
              summary={summary}
              dataTimestamp={dataTimestamp}
              COLORS={COLORS}
            />
          ) : (
            renderSkeleton()
          )}
        </Suspense>
      )}

      {/* 錯誤顯示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
          <p>{error}</p>
        </div>
      )}
    </main>
  );
}