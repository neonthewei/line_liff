"use client";

import { useEffect, useState } from "react";
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

  // 初始化控制台捕獲
  useEffect(() => {
    initConsoleCapture();
    addCustomLog("分析頁面已啟動，控制台捕獲已初始化");
  }, []);

  // 初始化 LIFF
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
    };

    initLiff();
  }, []);

  // 獲取交易數據
  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, currentDate]);

  // 處理數據並生成圖表數據
  useEffect(() => {
    if (transactions.length > 0) {
      processDataForCharts();
    }
  }, [transactions, activeTab]);

  // 獲取交易數據
  const fetchData = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // 獲取當月交易
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      addCustomLog(`正在獲取 ${year}年${month}月 的交易數據`);
      
      const transactionsData = await fetchTransactionsByUser(userId, year, month);
      console.log("獲取到的交易數據:", transactionsData);
      
      // 檢查交易數據的結構
      if (transactionsData && transactionsData.length > 0) {
        console.log("交易數據示例:", transactionsData[0]);
        console.log("交易類型分佈:", {
          expense: transactionsData.filter(tx => tx.type === "expense").length,
          income: transactionsData.filter(tx => tx.type === "income").length,
          other: transactionsData.filter(tx => tx.type !== "expense" && tx.type !== "income").length
        });
        
        // 檢查類別分佈
        const categories = transactionsData.reduce((acc, tx) => {
          const category = tx.category || "未分類";
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log("類別分佈:", categories);
      }
      
      setTransactions(transactionsData);
      
      // 獲取月度摘要
      const summaryData = await fetchMonthlySummary(userId, year, month);
      console.log("月度摘要:", summaryData);
      
      // 計算平均值 (假設一個月30天)
      const daysInMonth = new Date(year, month, 0).getDate();
      const averageExpense = summaryData.totalExpense / daysInMonth;
      const averageIncome = summaryData.totalIncome / daysInMonth;
      const averageBalance = summaryData.balance / daysInMonth;
      
      setSummary({
        ...summaryData,
        averageExpense,
        averageIncome,
        averageBalance
      });
      
      addCustomLog(`成功獲取 ${transactionsData.length} 筆交易數據`);
    } catch (err) {
      console.error("獲取數據錯誤:", err);
      setError("獲取數據失敗");
    } finally {
      setIsLoading(false);
    }
  };

  // 處理數據並生成圖表數據
  const processDataForCharts = () => {
    // 根據當前標籤過濾交易
    let filteredTransactions = transactions;
    
    if (activeTab === "expense") {
      filteredTransactions = transactions.filter(tx => tx.type === "expense");
    } else if (activeTab === "income") {
      filteredTransactions = transactions.filter(tx => tx.type === "income");
    }
    
    console.log("過濾後的交易數量:", filteredTransactions.length);
    
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
    
    console.log("類別分組:", categoryGroups);
    
    // 轉換為圓餅圖數據格式，並按金額降序排序
    const pieData = Object.keys(categoryGroups)
      .map(category => ({
        name: category,
        value: categoryGroups[category]
      }))
      .filter(item => item.value > 0) // 過濾掉值為0的項目
      .sort((a, b) => b.value - a.value); // 按金額降序排序
    
    console.log("圓餅圖數據:", pieData);
    addCustomLog(`圓餅圖數據: ${JSON.stringify(pieData)}`);
    setCategoryData(pieData);
    
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
    
    console.log("線圖數據:", lineData);
    setDailyData(lineData);
  };

  // 處理月份變更
  const handleMonthChange = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  // 處理標籤變更
  const handleTabChange = (tab: AnalysisTab) => {
    setActiveTab(tab);
  };

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

  return (
    <main className="container mx-auto max-w-md px-5 py-6 min-h-screen">
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
      <div className="bg-white rounded-2xl p-4 mb-5 shadow-sm">
        <h2 className="text-lg font-medium">類別分佈</h2>
        <div className="text-xs text-gray-500 mb-3 pb-2 border-b border-gray-100">
          {activeTab === "expense" ? "支出類別佔比分析" : "收入類別佔比分析"}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p>載入中...</p>
          </div>
        ) : categoryData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300} className="mt-0">
              <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  innerRadius={70}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={false}
                  paddingAngle={0}
                  isAnimationActive={false}
                  strokeWidth={0}
                  minAngle={1}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => {
                    const total = activeTab === "expense" ? summary.totalExpense : summary.totalIncome;
                    return `${((value / (total || 1)) * 100).toFixed(1)}%`;
                  }} 
                  labelFormatter={(name) => `${name}`}
                  isAnimationActive={false}
                />
                {/* 中間顯示總金額 */}
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-sm font-medium"
                >
                  <tspan x="50%" dy="-15" fontSize="14" fill="#666">
                    {activeTab === "expense" ? "總支出" : "總收入"}
                  </tspan>
                  <tspan x="50%" dy="28" fontSize="20" fontWeight="bold" fill="#333">
                    ${activeTab === "expense" ? summary.totalExpense.toFixed(0) : summary.totalIncome.toFixed(0)}
                  </tspan>
                </text>
              </PieChart>
            </ResponsiveContainer>
            
            {/* 日均支出/收入 - 小字顯示在圓餅圖下方 */}
            <div className="text-center text-xs text-gray-500 mt-0 mb-2">
              日均{activeTab === "expense" ? "支出" : "收入"}: ${activeTab === "expense" ? summary.averageExpense.toFixed(2) : summary.averageIncome.toFixed(2)}
            </div>
            
            {/* 自定義圖例 */}
            <div className="mt-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {categoryData.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded mr-2 flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">{entry.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {(entry.value / (activeTab === "expense" ? summary.totalExpense : summary.totalIncome) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p>無數據</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-medium">每日分佈</h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p>載入中...</p>
          </div>
        ) : dailyData.length > 0 ? (
          <>
            <div className="text-xs text-gray-500 mb-3 pb-2 border-b border-gray-100">
              {activeTab === "expense" ? "每日支出分佈圖表" : "每日收入分佈圖表"}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={dailyData}
                margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }}
                  interval="preserveEnd"
                  tickMargin={10}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis 
                  hide={true}
                  domain={[0, 'dataMax + 5']}
                />
                <Bar 
                  dataKey="percentage" 
                  fill="#10b981"
                  isAnimationActive={false}
                  unit="%"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                  name={activeTab === "expense" ? "支出佔比" : "收入佔比"}
                />
              </BarChart>
            </ResponsiveContainer>
            
            {/* 趨勢摘要 */}
            <div className="mt-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-x-2">
                  <div className="p-2">
                    <div className="text-xs text-gray-500 mb-1">最高日</div>
                    <div className="text-sm font-medium">
                      {dailyData.reduce((max, item) => item.percentage > max.percentage ? item : max, dailyData[0]).day}
                    </div>
                    <div className="text-green-500 font-medium">
                      {dailyData.reduce((max, item) => item.percentage > max.percentage ? item : max, dailyData[0]).percentage.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="p-2">
                    <div className="text-xs text-gray-500 mb-1">最低日</div>
                    <div className="text-sm font-medium">
                      {dailyData.filter(item => item.percentage > 0).reduce((min, item) => 
                        item.percentage < min.percentage ? item : min, 
                        dailyData.find(item => item.percentage > 0) || dailyData[0]
                      ).day}
                    </div>
                    <div className="text-green-500 font-medium">
                      {dailyData.filter(item => item.percentage > 0).reduce((min, item) => 
                        item.percentage < min.percentage ? item : min, 
                        dailyData.find(item => item.percentage > 0) || dailyData[0]
                      ).percentage.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="p-2">
                    <div className="text-xs text-gray-500 mb-1">日均</div>
                    <div className="text-sm font-medium">
                      {activeTab === "expense" ? "支出" : "收入"}
                    </div>
                    <div className="text-green-500 font-medium">
                      {(100 / dailyData.filter(item => item.percentage > 0).length).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p>無數據</p>
          </div>
        )}
      </div>

      {/* 錯誤顯示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
          <p>{error}</p>
        </div>
      )}
    </main>
  );
}