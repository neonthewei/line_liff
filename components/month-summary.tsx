"use client"

import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface MonthSummaryProps {
  currentDate: Date
  summary?: {
    totalExpense: number
    totalIncome: number
    balance: number
  }
  isLoading?: boolean
  onClick?: () => void
}

export default function MonthSummary({ 
  currentDate, 
  summary = { totalExpense: 0, totalIncome: 0, balance: 0 },
  isLoading = false,
  onClick
}: MonthSummaryProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handleClick = () => {
    if (onClick) onClick()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (onClick) onClick()
    }
  }

  const handleMouseDown = () => {
    setIsPressed(true)
  }

  const handleMouseUp = () => {
    setIsPressed(false)
  }

  return (
    <div 
      className={`mb-4 bg-green-500 text-white rounded-2xl overflow-hidden shadow-sm 
        transition-all duration-100 ease-in-out
        ${!isLoading ? 'cursor-pointer active:brightness-95 active:scale-[0.98]' : ''}
        ${isPressed ? 'brightness-95 scale-[0.99]' : ''}
      `}
      onClick={!isLoading ? handleClick : undefined}
      onKeyDown={!isLoading ? handleKeyDown : undefined}
      onMouseDown={!isLoading ? handleMouseDown : undefined}
      onMouseUp={!isLoading ? handleMouseUp : undefined}
      onMouseLeave={isPressed ? handleMouseUp : undefined}
      role={!isLoading ? "button" : undefined}
      tabIndex={!isLoading ? 0 : undefined}
      aria-label={!isLoading ? `${currentDate.getFullYear()}年${(currentDate.getMonth() + 1).toString().padStart(2, '0')}月的財務摘要` : undefined}
    >
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
          <div className="h-[94px] flex flex-col justify-between">
            <div className="mb-4">
              <Skeleton className="h-10 w-40 bg-white/30" />
            </div>
            <div className="flex justify-between">
              <div className="flex flex-col">
                <Skeleton className="h-3 w-12 mb-1 bg-white/30" />
                <Skeleton className="h-5 w-20 bg-white/30" />
              </div>
              <div className="flex flex-col">
                <Skeleton className="h-3 w-12 mb-1 bg-white/30" />
                <Skeleton className="h-5 w-20 bg-white/30" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="text-4xl font-bold mb-4">${summary.totalExpense}</div>

            <div className="flex justify-between text-sm">
              <div className="flex flex-col">
                <span className="text-xs opacity-80 mb-0.5">月收入</span>
                <span className="font-medium">${summary.totalIncome}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs opacity-80 mb-0.5">月結餘</span>
                <span className="font-medium">${summary.balance}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 