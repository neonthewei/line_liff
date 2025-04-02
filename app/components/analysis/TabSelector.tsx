"use client";

import React from "react";

interface TabSelectorProps {
  activeTab: "expense" | "income";
  onTabChange: (tab: "expense" | "income") => void;
}

export default function TabSelector({
  activeTab,
  onTabChange,
}: TabSelectorProps) {
  const handleTabChange = (tab: "expense" | "income") => {
    onTabChange(tab);
  };

  return (
    <div className="flex bg-white rounded-2xl p-2 mb-5 shadow-sm">
      <div className="flex w-full relative">
        {/* 兩個按鈕的容器 */}
        <div className="flex w-full rounded-xl overflow-hidden">
          {/* 綠色背景區塊 - 固定位置，使用動畫 */}
          <div
            className={`absolute top-0 bottom-0 w-1/2 rounded-xl bg-green-500 transition-transform duration-300 ease-in-out ${
              activeTab === "expense" ? "left-0" : "translate-x-full"
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
  );
}
