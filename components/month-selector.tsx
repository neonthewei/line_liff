"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react"

interface MonthSelectorProps {
  currentDate: Date
  onMonthChange: (newDate: Date) => void
}

export default function MonthSelector({ currentDate, onMonthChange }: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [year, setYear] = useState(currentDate.getFullYear())
  const [contentHeight, setContentHeight] = useState<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const formatMonth = (date: Date) => {
    return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月`
  }

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [isOpen, year])

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, i)
    return {
      value: i,
      label: `${i + 1}月`,
    }
  })

  const handlePrevYear = () => setYear(year - 1)
  const handleNextYear = () => setYear(year + 1)

  const handleSelectMonth = (month: number) => {
    onMonthChange(new Date(year, month))
    setIsOpen(false)
  }

  const toggleOpen = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="mb-4 bg-white rounded-2xl shadow-sm overflow-hidden">
      <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50" onClick={toggleOpen}>
        <span className="font-medium text-lg text-gray-900">{formatMonth(currentDate)}</span>
        {isOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          height: isOpen ? (contentHeight ? `${contentHeight}px` : "auto") : "0px",
        }}
      >
        <div ref={contentRef} className="px-4 pb-4">
          <div className="flex items-center justify-between mb-4 pt-2">
            <button
              onClick={handlePrevYear}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-xl font-bold">{year}</div>
            <button
              onClick={handleNextYear}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {months.map(({ value, label }) => {
              const isSelected = year === currentDate.getFullYear() && value === currentDate.getMonth()

              return (
                <button
                  key={value}
                  onClick={() => handleSelectMonth(value)}
                  className={`py-3 px-4 rounded-xl text-base transition-all ${
                    isSelected ? "bg-green-500 text-white font-medium" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
} 