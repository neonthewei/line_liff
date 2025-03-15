"use client"

import { useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import type { Transaction } from "@/types/transaction"

interface TransactionListProps {
  transactions: Transaction[]
  currentDate: Date
  activeTab: "general" | "fixed"
  isLoading?: boolean
  isCollapsed?: boolean
  onTransactionClick: (id: string, type: string) => void
}

export default function TransactionList({ 
  transactions, 
  currentDate, 
  activeTab,
  isLoading = false,
  isCollapsed = false,
  onTransactionClick 
}: TransactionListProps) {
  const [groupedTransactions, setGroupedTransactions] = useState<Record<string, Transaction[]>>({})
  const [groupedFixedTransactions, setGroupedFixedTransactions] = useState<{
    expense: Transaction[],
    income: Transaction[]
  }>({ expense: [], income: [] })

  useEffect(() => {
    const processTransactions = async () => {
      if (transactions.length === 0) {
        setGroupedTransactions({});
        setGroupedFixedTransactions({ expense: [], income: [] });
        return;
      }

      // 根據選定的標籤過濾數據
      const filteredData = transactions.filter((transaction) => 
        (activeTab === "general" ? !transaction.isFixed : transaction.isFixed)
      )
      
      // 如果是固定支出/收入標籤，按類型分組
      if (activeTab === "fixed") {
        const expenseTransactions = filteredData.filter(tx => tx.type === "expense");
        const incomeTransactions = filteredData.filter(tx => tx.type === "income");
        
        setGroupedFixedTransactions({
          expense: expenseTransactions,
          income: incomeTransactions
        });
        
        // 清空日期分組數據
        setGroupedTransactions({});
        return;
      }
      
      // 一般記錄按日期分組
      const groupedByDate: Record<string, Transaction[]> = {}
      filteredData.forEach((transaction) => {
        // 從 "YYYY年MM月DD日" 格式解析日期
        let date: string;
        try {
          const match = transaction.date.match(/(\d+)年(\d+)月(\d+)日/);
          if (match) {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]) - 1; // JavaScript 月份從 0 開始
            const day = parseInt(match[3]);
            
            // Create date at noon to avoid timezone issues
            const txDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
            date = txDate.toISOString().split("T")[0];
          } else {
            // 如果不是 "YYYY年MM月DD日" 格式，嘗試直接解析
            const txDate = new Date(transaction.date);
            date = txDate.toISOString().split("T")[0];
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

      setGroupedTransactions(groupedByDate);
      
      // 調試信息
      console.log(`處理了 ${filteredData.length} 筆交易，分組為 ${Object.keys(groupedByDate).length} 天`);
    }

    processTransactions();
  }, [transactions, activeTab]);

  if (isLoading) {
    return <div className="text-center py-8">載入中...</div>;
  }

  // 固定支出/收入的顯示邏輯
  if (activeTab === "fixed") {
    const { expense, income } = groupedFixedTransactions;
    
    if (expense.length === 0 && income.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          本月尚無固定記錄
        </div>
      );
    }
    
    return (
      <div className="space-y-4 pb-4">
        {/* 固定支出區塊 */}
        {expense.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3 border-b">
              <div className="font-medium text-base text-gray-700">
                固定支出
              </div>
              <div className="text-xs text-gray-500">
                -${expense.reduce((sum, tx) => sum + Math.abs(tx.amount), 0).toFixed(2)}
              </div>
            </div>

            <div 
              className={`transition-all ${
                isCollapsed 
                  ? 'duration-150 max-h-0 opacity-0 scale-y-95 origin-top' 
                  : 'duration-300 max-h-[2000px] opacity-100 scale-y-100'
              } overflow-hidden ease-in-out`}
              style={{
                transitionDelay: isCollapsed ? '100ms' : '200ms'
              }}
            >
              <div className="divide-y divide-gray-100">
                {expense.map((transaction, index) => (
                  <div 
                    key={`expense-${transaction.id}-${index}`}
                    onClick={() => onTransactionClick(transaction.id, transaction.type)}
                    className="px-4 py-3 flex items-center justify-between cursor-pointer active:bg-gray-100"
                  >
                    <div className="flex items-center">
                      <div>
                        <div className="font-medium text-green-600">{transaction.category}</div>
                        {transaction.note && <div className="text-xs text-gray-500 mt-0.5">{transaction.note}</div>}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="text-lg font-bold mr-2 text-gray-900">
                        -${Math.abs(transaction.amount).toFixed(2)}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 固定收入區塊 */}
        {income.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3 border-b">
              <div className="font-medium text-base text-gray-700">
                固定收入
              </div>
              <div className="text-xs text-gray-500">
                +${income.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)}
              </div>
            </div>

            <div 
              className={`transition-all ${
                isCollapsed 
                  ? 'duration-150 max-h-0 opacity-0 scale-y-95 origin-top' 
                  : 'duration-300 max-h-[2000px] opacity-100 scale-y-100'
              } overflow-hidden ease-in-out`}
              style={{
                transitionDelay: isCollapsed ? '0ms' : '50ms'
              }}
            >
              <div className="divide-y divide-gray-100">
                {income.map((transaction, index) => (
                  <div 
                    key={`income-${transaction.id}-${index}`}
                    onClick={() => onTransactionClick(transaction.id, transaction.type)}
                    className="px-4 py-3 flex items-center justify-between cursor-pointer active:bg-gray-100"
                  >
                    <div className="flex items-center">
                      <div>
                        <div className="font-medium text-blue-600">{transaction.category}</div>
                        {transaction.note && <div className="text-xs text-gray-500 mt-0.5">{transaction.note}</div>}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="text-lg font-bold mr-2 text-gray-900">
                        +${transaction.amount.toFixed(2)}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 一般記錄的顯示邏輯（按日期分組）
  if (Object.keys(groupedTransactions).length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        本月尚無一般記錄
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {Object.entries(groupedTransactions)
        .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
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

          return (
            <div key={`date-${date}`} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex justify-between items-center px-5 py-3 border-b">
                <div className="font-medium text-base text-gray-700">
                  {formattedDate}
                </div>
                <div className="text-xs text-gray-500">
                  {/* 計算淨額（收入減去支出） */}
                  {(() => {
                    const netAmount = incomeTotal - expenseTotal;
                    const prefix = netAmount >= 0 ? "+" : "-";
                    return `${prefix}$${Math.abs(netAmount).toFixed(2)}`;
                  })()}
                </div>
              </div>

              <div 
                className={`transition-all ${
                  isCollapsed 
                    ? 'duration-150 max-h-0 opacity-0 scale-y-95 origin-top' 
                    : 'duration-300 max-h-[2000px] opacity-100 scale-y-100'
                } overflow-hidden ease-in-out`}
                style={{
                  transitionDelay: isCollapsed ? '0ms' : `${groupIndex * 30}ms`
                }}
              >
                <div className="divide-y divide-gray-100">
                  {dayTransactions.map((transaction, index) => (
                    <div 
                      key={`tx-${transaction.id}-${index}`}
                      onClick={() => onTransactionClick(transaction.id, transaction.type)}
                      className="px-4 py-3 flex items-center justify-between cursor-pointer active:bg-gray-100"
                    >
                      <div className="flex items-center">
                        <div>
                          <div className={`font-medium ${transaction.type === "expense" ? "text-green-600" : "text-blue-600"}`}>{transaction.category}</div>
                          {transaction.note && <div className="text-xs text-gray-500 mt-0.5">{transaction.note}</div>}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="text-lg font-bold mr-2 text-gray-900">
                          {transaction.type === "expense" ? "-" : "+"}${Math.abs(transaction.amount).toFixed(2)}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
} 