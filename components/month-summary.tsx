"use client"

interface MonthSummaryProps {
  currentDate: Date
  summary?: {
    totalExpense: number
    totalIncome: number
    balance: number
  }
  isLoading?: boolean
}

export default function MonthSummary({ 
  currentDate, 
  summary = { totalExpense: 0, totalIncome: 0, balance: 0 },
  isLoading = false
}: MonthSummaryProps) {
  return (
    <div className="mb-4 bg-green-500 text-white rounded-2xl overflow-hidden shadow-sm">
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div className="text-sm font-medium">月支出</div>
          {!isLoading && (
            <div className="text-xs opacity-80">
              {currentDate.getFullYear()}年{(currentDate.getMonth() + 1).toString().padStart(2, '0')}月
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="text-3xl font-bold mb-4">載入中...</div>
        ) : (
          <>
            <div className="text-4xl font-bold mb-4">${summary.totalExpense.toFixed(2)}</div>

            <div className="flex justify-between text-sm">
              <div className="flex flex-col">
                <span className="text-xs opacity-80 mb-0.5">月收入</span>
                <span className="font-medium">${summary.totalIncome.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs opacity-80 mb-0.5">月結餘</span>
                <span className="font-medium">${summary.balance.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 