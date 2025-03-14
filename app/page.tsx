"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";

// 模擬交易數據
const mockTransactions = [
  {
    id: "1",
    category: "餐飲",
    amount: -120,
    date: "2023年05月15日",
    type: "expense",
    note: "午餐",
  },
  {
    id: "2",
    category: "購物",
    amount: -580,
    date: "2023年05月14日",
    type: "expense",
    note: "衣服",
  },
  {
    id: "3",
    category: "薪資",
    amount: 25000,
    date: "2023年05月10日",
    type: "income",
    note: "五月薪資",
  },
  {
    id: "4",
    category: "交通",
    amount: -70,
    date: "2023年05月08日",
    type: "expense",
    note: "計程車",
  },
  {
    id: "5",
    category: "娛樂",
    amount: -350,
    date: "2023年05月05日",
    type: "expense",
    note: "電影",
  },
  {
    id: "6",
    category: "獎金",
    amount: 3000,
    date: "2023年05月01日",
    type: "income",
    note: "專案獎金",
  },
];

export default function Home() {
  const router = useRouter();
  const [transactions] = useState(mockTransactions);

  // 按日期分組交易
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, typeof transactions>);

  // 計算總收入和支出
  const totals = transactions.reduce(
    (acc, transaction) => {
      if (transaction.amount > 0) {
        acc.income += transaction.amount;
      } else {
        acc.expense += Math.abs(transaction.amount);
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const handleTransactionClick = (id: string, type: string) => {
    router.push(`/transaction?id=${id}&type=${type}`);
  };

  return (
    <div className="w-full max-w-md mx-auto pb-20">
      {/* 頂部標題 */}
      <div className="bg-white sticky top-0 z-20 px-4 py-4 flex items-center border-b border-gray-100 shadow-sm">
        <h1 className="text-xl font-medium text-gray-800 flex-1 text-center">
          記帳明細
        </h1>
      </div>

      {/* 總覽卡片 */}
      <div className="bg-white p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-medium text-gray-800">本月總覽</h2>
          <span className="text-sm text-gray-500">2023年05月</span>
        </div>
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-gray-500">收入</p>
            <p className="text-lg text-green-500">${totals.income}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">支出</p>
            <p className="text-lg text-red-500">${totals.expense}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">結餘</p>
            <p className="text-lg text-blue-500">
              ${totals.income - totals.expense}
            </p>
          </div>
        </div>
      </div>

      {/* 交易列表 */}
      <div className="space-y-4 px-4">
        {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
          <div key={date} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-600">{date}</h3>
            </div>
            <div>
              {dayTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="px-4 py-3 border-b border-gray-100 last:border-b-0 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => handleTransactionClick(transaction.id, transaction.type)}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                      <span className="text-sm">{transaction.category.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{transaction.category}</p>
                      <p className="text-xs text-gray-500">{transaction.note}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`mr-2 ${transaction.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                      {transaction.amount > 0 ? "+" : "-"}${Math.abs(transaction.amount)}
                    </span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 新增按鈕 */}
      <div className="fixed bottom-6 right-6">
        <button
          className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg"
          onClick={() => router.push("/transaction/new")}
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
}
