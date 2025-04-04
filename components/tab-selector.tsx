"use client";

import { useEffect, useRef, useState } from "react";

interface TabSelectorProps {
  activeTab: "general" | "fixed";
  onTabChange: (tab: "general" | "fixed") => void;
}

export default function TabSelector({
  activeTab,
  onTabChange,
}: TabSelectorProps) {
  const handleTabClick = (tab: "general" | "fixed") => {
    onTabChange(tab);
  };

  return (
    <div className="flex bg-white rounded-2xl p-2 mb-4 shadow-sm">
      <div className="flex w-full relative">
        {/* 兩個按鈕的容器 */}
        <div className="flex w-full rounded-xl overflow-hidden">
          {/* 綠色背景區塊 - 固定位置，使用動畫 */}
          <div
            className={`absolute top-0 bottom-0 w-1/2 rounded-xl bg-green-500 transition-transform duration-300 ease-in-out ${
              activeTab === "general" ? "left-0" : "translate-x-full"
            }`}
          />

          {/* 按鈕 - 文字始終保持粗體，只改變顏色 */}
          <button
            data-tab="general"
            className={`w-1/2 py-2.5 text-center text-base relative z-10 transition-colors duration-300 ease-in-out font-medium ${
              activeTab === "general" ? "text-white" : "text-gray-600"
            }`}
            onClick={() => handleTabClick("general")}
            aria-label="一般標籤"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleTabClick("general")}
          >
            一般
          </button>
          <button
            data-tab="fixed"
            className={`w-1/2 py-2.5 text-center text-base relative z-10 transition-colors duration-300 ease-in-out font-medium ${
              activeTab === "fixed" ? "text-white" : "text-gray-600"
            }`}
            onClick={() => handleTabClick("fixed")}
            aria-label="定期標籤"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleTabClick("fixed")}
          >
            定期
          </button>
        </div>
      </div>
    </div>
  );
}
