"use client"

interface TabSelectorProps {
  activeTab: "general" | "fixed"
  onTabChange: (tab: "general" | "fixed") => void
}

export default function TabSelector({ activeTab, onTabChange }: TabSelectorProps) {
  return (
    <div className="flex bg-white rounded-2xl p-1.5 mb-4 shadow-sm">
      <button
        className={`flex-1 py-2.5 text-center rounded-xl transition-all text-base ${
          activeTab === "general" ? "bg-green-500 text-white font-medium" : "text-gray-600 hover:bg-gray-50"
        }`}
        onClick={() => onTabChange("general")}
        aria-label="一般交易"
        tabIndex={0}
      >
        一般
      </button>
      <button
        className={`flex-1 py-2.5 text-center rounded-xl transition-all text-base ${
          activeTab === "fixed" ? "bg-green-500 text-white font-medium" : "text-gray-600 hover:bg-gray-50"
        }`}
        onClick={() => onTabChange("fixed")}
        aria-label="固定交易"
        tabIndex={0}
      >
        固定
      </button>
    </div>
  )
} 