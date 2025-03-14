"use client"

import { useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import type { Transaction } from "@/types/transaction"

interface TransactionListProps {
  transactions: Transaction[]
  currentDate: Date
  activeTab: "general" | "fixed"
  isLoading?: boolean
  onTransactionClick: (id: string, type: string) => void
}

export default function TransactionList({ 
  transactions, 
  currentDate, 
  activeTab,
  isLoading = false,
  onTransactionClick 
}: TransactionListProps) {
  const [groupedTransactions, setGroupedTransactions] = useState<Record<string, Transaction[]>>({})

  useEffect(() => {
    const processTransactions = async () => {
      if (transactions.length === 0) {
        setGroupedTransactions({});
        return;
      }

      // 根據選定的標籤過濾數據
      const filteredData = transactions.filter((transaction) => 
        (activeTab === "general" ? !transaction.isFixed : transaction.isFixed)
      )
      
      // 按日期分組
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
            const txDate = new Date(year, month, day);
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

  if (Object.keys(groupedTransactions).length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {activeTab === "general" ? "本月尚無一般記錄" : "本月尚無固定記錄"}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {Object.entries(groupedTransactions)
        .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
        .map(([date, dayTransactions]) => {
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
                <div className="text-xs text-gray-500 flex flex-col items-end">
                  {expenseTotal > 0 && <div>支 ${expenseTotal.toFixed(2)}</div>}
                  {incomeTotal > 0 && <div>收 ${incomeTotal.toFixed(2)}</div>}
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {dayTransactions.map((transaction, index) => (
                  <div 
                    key={`tx-${transaction.id}-${index}`}
                    onClick={() => onTransactionClick(transaction.id, transaction.type)}
                    onKeyDown={(e) => e.key === 'Enter' && onTransactionClick(transaction.id, transaction.type)}
                    className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    tabIndex={0}
                    aria-label={`${transaction.category} ${transaction.type === "expense" ? "支出" : "收入"} ${Math.abs(transaction.amount).toFixed(2)}`}
                  >
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full ${transaction.type === "expense" ? "bg-red-100" : "bg-green-100"} flex items-center justify-center mr-3`}>
                        <span className={`text-sm ${transaction.type === "expense" ? "text-red-500" : "text-green-500"}`}>
                          {transaction.category.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{transaction.category}</div>
                        {transaction.note && <div className="text-xs text-gray-500 mt-0.5">{transaction.note}</div>}
                        {transaction.isFixed && (
                          <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            固定{transaction.type === "expense" ? "支出" : "收入"}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className={`text-lg font-bold mr-2 ${transaction.type === "expense" ? "text-red-500" : "text-green-500"}`}>
                        {transaction.type === "expense" ? "-" : "+"}${Math.abs(transaction.amount).toFixed(2)}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
} 