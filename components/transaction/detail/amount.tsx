import { useState } from "react";
import { Edit } from "lucide-react";

interface AmountProps {
  amount: number;
  type: "expense" | "income";
  onChange: (amount: number) => void;
}

export function Amount({ amount, type, onChange }: AmountProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditAmount(Math.abs(amount).toString());
  };

  const handleSave = () => {
    const parsedAmount = Number.parseFloat(editAmount);
    if (!isNaN(parsedAmount)) {
      // 確保金額的正負號與交易類型一致
      const signedAmount =
        type === "expense" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
      onChange(signedAmount);
    }
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditAmount(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600 pl-2">金額</span>
      <div className="flex items-center">
        {isEditing ? (
          <div className="flex items-center">
            {type === "expense" && <span className="text-gray-800">-</span>}
            <span className="text-gray-800 mr-[0.5rem]">$</span>
            <div className="relative inline-block">
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={editAmount}
                onChange={handleChange}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="w-32 px-2 py-1 rounded-lg text-right focus:outline-none"
                autoFocus
              />
              <div className="absolute inset-0 pointer-events-none border border-gray-300 rounded-lg"></div>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center cursor-pointer px-2 py-1 rounded-lg"
            onClick={handleStartEdit}
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleStartEdit()}
            aria-label="編輯金額"
          >
            {type === "expense" && <span className="text-gray-800">-</span>}
            <span className="text-gray-800 mr-[0.5rem]">$</span>
            <span className="text-gray-800">{Math.abs(amount)}</span>
            <Edit className="h-5 w-5 mr-0.5 ml-2.5 text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
}
