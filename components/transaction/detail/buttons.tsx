import { Check, ArrowLeft, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

// ActionButtons 元件的 Props
interface ActionButtonsProps {
  hasChanges: boolean;
  onConfirm: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

// DeleteModal 元件的 Props
interface DeleteModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  transactionCount?: number;
}

// 操作按鈕元件
export function ActionButtons({
  hasChanges,
  onConfirm,
  onDelete,
  disabled = false,
}: ActionButtonsProps) {
  const [isButtonsDisabled, setIsButtonsDisabled] = useState(true);

  // 添加一個小延遲以防止意外點擊
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsButtonsDisabled(disabled);
    }, 300);

    return () => clearTimeout(timer);
  }, [disabled]);

  return (
    <div className="space-y-4 mt-8">
      {/* 確認按鈕 */}
      <button
        onClick={onConfirm}
        disabled={isButtonsDisabled}
        className={`w-full py-3 rounded-2xl flex items-center justify-center ${
          hasChanges
            ? "bg-[#22c55e] text-white active:bg-green-600"
            : "bg-gray-200 text-gray-600 active:bg-gray-300"
        } transition-[background-color] duration-150 ${
          isButtonsDisabled ? "pointer-events-none" : ""
        }`}
      >
        {hasChanges ? (
          <>
            <Check size={20} className="mr-2" />
            更新
          </>
        ) : (
          <>
            <ArrowLeft size={20} className="mr-2" />
            返回
          </>
        )}
      </button>

      {/* 刪除按鈕 */}
      <button
        onClick={onDelete}
        disabled={isButtonsDisabled}
        className={`w-full py-3 rounded-2xl bg-red-500 text-white flex items-center justify-center transition-colors duration-150 active:bg-red-600 ${
          isButtonsDisabled ? "pointer-events-none" : ""
        }`}
      >
        <Trash2 size={20} className="mr-2" />
        刪除
      </button>
    </div>
  );
}

// 刪除確認對話框元件
export function DeleteModal({ onConfirm, onCancel, transactionCount = 0 }: DeleteModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl transform animate-scaleInStatic"
        onClick={(e) => e.stopPropagation()} // 防止點擊內容區域時關閉視窗
      >
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <Trash2 className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            確定要刪除嗎？
          </h3>
          {transactionCount > 0 ? (
            <p className="text-sm text-red-500 font-medium">
              注意: 所有 {transactionCount} 筆屬於此類型的交易記錄也將被刪除。
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              此操作無法復原，刪除後資料將永久消失。
            </p>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl bg-gray-200 text-gray-700 font-medium transition-all duration-150 active:bg-gray-300"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-red-500 text-white font-medium transition-all duration-150 active:bg-red-600"
          >
            確定刪除
          </button>
        </div>
      </div>
    </div>
  );
}
