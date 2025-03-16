"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react"

// Define the view type for the selector
export type ViewType = "month" | "year"

interface AnalysisMonthSelectorProps {
  currentDate: Date
  onMonthChange: (newDate: Date, viewType: ViewType) => void
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

export default function AnalysisMonthSelector({ 
  currentDate, 
  onMonthChange, 
  activeView, 
  onViewChange 
}: AnalysisMonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [year, setYear] = useState(currentDate.getFullYear())
  const [contentHeight, setContentHeight] = useState<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const formatDate = (date: Date) => {
    return activeView === "month" 
      ? `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月`
      : `${date.getFullYear()}年`;
  }

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [isOpen, year, activeView])

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, i)
    return {
      value: i,
      label: `${i + 1}月`,
    }
  })

  // Generate years for the year view (current year ± 5 years)
  const years = Array.from({ length: 11 }, (_, i) => {
    const yearValue = currentDate.getFullYear() - 5 + i
    return {
      value: yearValue,
      label: `${yearValue}`,
    }
  })

  const handlePrevYear = () => setYear(year - 1)
  const handleNextYear = () => setYear(year + 1)

  const handleSelectMonth = (month: number) => {
    onMonthChange(new Date(year, month), "month")
    setIsOpen(false)
  }

  const handleSelectYear = (selectedYear: number) => {
    // When selecting a year in year view, set month to January (0)
    const newDate = new Date(selectedYear, 0, 1)
    onMonthChange(newDate, "year")
    setYear(selectedYear)
    setIsOpen(false)
  }

  const toggleOpen = () => {
    setIsOpen(!isOpen)
  }

  const handleViewChange = (view: ViewType) => {
    onViewChange(view)
    
    // If switching to year view, update the date to January 1st of the current year
    if (view === "year" && activeView === "month") {
      const newDate = new Date(currentDate.getFullYear(), 0, 1)
      onMonthChange(newDate, view)
    }
    // If switching to month view from year view, keep the current year but set to current month
    else if (view === "month" && activeView === "year") {
      const currentMonth = new Date().getMonth()
      const newDate = new Date(currentDate.getFullYear(), currentMonth, 1)
      onMonthChange(newDate, view)
    }
  }

  return (
    <div className="mb-4 bg-white rounded-2xl shadow-sm overflow-hidden">
      <button className="w-full flex items-center justify-between px-4 py-3 active:bg-gray-100" onClick={toggleOpen}>
        <span className="font-medium text-lg text-gray-900">{formatDate(currentDate)}</span>
        {isOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          height: isOpen ? (contentHeight ? `${contentHeight}px` : "auto") : "0px",
        }}
      >
        <div ref={contentRef} className="px-4 pb-4">
          {/* Tab selector */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4 mt-2">
            <button
              onClick={() => handleViewChange("month")}
              className={`flex-1 py-2 text-center rounded-lg transition-all ${
                activeView === "month" ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-600"
              }`}
            >
              按月
            </button>
            <button
              onClick={() => handleViewChange("year")}
              className={`flex-1 py-2 text-center rounded-lg transition-all ${
                activeView === "year" ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-600"
              }`}
            >
              按年
            </button>
          </div>

          {activeView === "month" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevYear}
                  className="w-10 h-10 flex items-center justify-center rounded-xl active:bg-gray-100"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-xl font-bold">{year}</div>
                <button
                  onClick={handleNextYear}
                  className="w-10 h-10 flex items-center justify-center rounded-xl active:bg-gray-100"
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
                        isSelected ? "bg-green-500 text-white font-medium" : "text-gray-600 active:bg-gray-100"
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {activeView === "year" && (
            <div className="grid grid-cols-3 gap-3">
              {years.map(({ value, label }) => {
                const isSelected = value === currentDate.getFullYear()

                return (
                  <button
                    key={value}
                    onClick={() => handleSelectYear(value)}
                    className={`py-3 px-4 rounded-xl text-base transition-all ${
                      isSelected ? "bg-green-500 text-white font-medium" : "text-gray-600 active:bg-gray-100"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 