import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getDaysInMonth,
  getFirstDayOfMonth,
  formatDateToChineseString,
  getMonthName,
} from "../shared/utils";

interface DatePickerProps {
  date: string;
  onChange: (date: string) => void;
}

export function DatePicker({ date, onChange }: DatePickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);

  // 標記組件已掛載到客戶端
  useEffect(() => {
    setIsMounted(true);

    // 嘗試從當前日期解析出年月日
    const match = date.match(/(\d+)年(\d+)月(\d+)日/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1; // 月份從0開始
      const day = parseInt(match[3]);

      // 設置日曆日期為當前交易日期
      setCalendarDate(new Date(year, month, day));
    }
  }, [date]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handlePrevMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCalendarDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCalendarDate(newDate);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value);
    const newDate = new Date(calendarDate);
    newDate.setFullYear(year);
    setCalendarDate(newDate);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = parseInt(e.target.value);
    const newDate = new Date(calendarDate);
    newDate.setMonth(month);
    setCalendarDate(newDate);
  };

  const handleDateSelect = (date: Date) => {
    const formattedDate = formatDateToChineseString(date);
    onChange(formattedDate);
    setIsExpanded(false);
  };

  // 生成年份選項
  const generateYearOptions = () => {
    // 服務器渲染時使用固定年份
    const currentYear = isMounted ? new Date().getFullYear() : 2025;
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };

  // 生成月份選項
  const generateMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push(i);
    }
    return months;
  };

  // 生成月曆
  const renderCalendar = () => {
    // 服務器渲染時不生成日曆
    if (!isMounted) {
      return Array(42)
        .fill(null)
        .map((_, i) => <div key={`placeholder-${i}`} className="h-8"></div>);
    }

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    const days = [];

    // 填充月初的空白
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // 填充日期
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      const dateString = formatDateToChineseString(currentDate);
      const isSelected = dateString === date;

      days.push(
        <button
          key={`day-${i}`}
          className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            isSelected ? "bg-green-500 text-white" : ""
          }`}
          onClick={() => handleDateSelect(currentDate)}
        >
          {i}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-gray-600 pl-2">日期</span>
        <div
          className="flex items-center cursor-pointer px-2 py-1 rounded-lg"
          onClick={toggleExpand}
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && toggleExpand()}
          aria-label="編輯日期"
        >
          <span className="text-gray-800">{date}</span>
          {isExpanded ? (
            <ChevronUp className="ml-2 text-gray-400" />
          ) : (
            <ChevronDown className="ml-2 text-gray-400" />
          )}
        </div>
      </div>

      {/* 日曆選擇器 */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="rounded-lg">
            {/* 年月選擇器 */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-full"
                aria-label="上個月"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex space-x-2">
                <select
                  value={isMounted ? calendarDate.getFullYear() : 2025}
                  onChange={handleYearChange}
                  className="px-2 py-1 pr-4 border border-gray-200 rounded-lg bg-white focus:outline-none"
                >
                  {generateYearOptions().map((year) => (
                    <option key={year} value={year}>
                      {year}年
                    </option>
                  ))}
                </select>

                <select
                  value={isMounted ? calendarDate.getMonth() : 0}
                  onChange={handleMonthChange}
                  className="px-2 py-1 pr-4 border border-gray-200 rounded-lg bg-white focus:outline-none"
                >
                  {generateMonthOptions().map((month) => (
                    <option key={month} value={month}>
                      {getMonthName(month)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-1 rounded-full"
                aria-label="下個月"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* 星期標題 */}
            <div className="grid grid-cols-7 mb-2">
              {["日", "一", "二", "三", "四", "五", "六"].map((day, index) => (
                <div key={index} className="text-center text-gray-500 text-sm">
                  {day}
                </div>
              ))}
            </div>

            {/* 日曆主體 */}
            <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
