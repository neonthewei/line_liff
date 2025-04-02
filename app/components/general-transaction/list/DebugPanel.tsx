import React from "react";
import { DebugPanelProps } from "./types";

export const DebugPanel: React.FC<DebugPanelProps> = ({
  isDebugMode,
  isDebugCollapsed,
  setIsDebugCollapsed,
  activeTab,
  isLoading,
  isTabSwitching,
  transactionsCount,
  currentDate,
  displayTransactionsCount,
}) => {
  if (!isDebugMode) return null;

  return isDebugCollapsed ? (
    // Collapsed view - small indicator at bottom right
    <div
      className="fixed bottom-2 right-2 bg-gray-800 text-white px-3 py-1.5 rounded-full text-xs shadow-lg z-50 flex items-center cursor-pointer"
      onClick={() => setIsDebugCollapsed(false)}
    >
      <span className="mr-1">Debug</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </div>
  ) : (
    // Expanded view - full debug panel
    <div className="fixed top-0 left-0 right-0 bg-gray-900 text-white p-3 z-50 overflow-auto max-h-[70vh] text-xs">
      <div className="flex justify-between items-center mb-2">
        <div className="font-semibold">Transaction List Debug Info:</div>
        <button
          className="text-white hover:text-gray-300 p-1"
          onClick={() => setIsDebugCollapsed(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
      <div className="mb-2">
        <div>Active Tab: {activeTab}</div>
        <div>Is Loading: {isLoading ? "Yes" : "No"}</div>
        <div>Is Tab Switching: {isTabSwitching ? "Yes" : "No"}</div>
        <div>Transaction Count: {transactionsCount}</div>
        <div>Current Date: {currentDate.toISOString()}</div>
        <div>Display Transactions Count: {displayTransactionsCount}</div>
      </div>
    </div>
  );
};
