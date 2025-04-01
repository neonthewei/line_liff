interface TypeProps {
  type: "expense" | "income";
  onChange: (type: "expense" | "income") => void;
}

export function Type({ type, onChange }: TypeProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600 pl-2">屬性</span>
      <div className="flex gap-2">
        <button
          className={`px-6 py-1 rounded-xl min-w-[5rem] transition-all duration-150 ${
            type === "expense"
              ? "bg-[#22c55e] text-white active:bg-green-600 active:scale-[0.98]"
              : "bg-gray-200 text-gray-600 active:bg-gray-300 active:scale-[0.98]"
          }`}
          onClick={() => onChange("expense")}
        >
          支出
        </button>
        <button
          className={`px-6 py-1 rounded-xl min-w-[5rem] transition-all duration-150 ${
            type === "income"
              ? "bg-[#22c55e] text-white active:bg-green-600 active:scale-[0.98]"
              : "bg-gray-200 text-gray-600 active:bg-gray-300 active:scale-[0.98]"
          }`}
          onClick={() => onChange("income")}
        >
          收入
        </button>
      </div>
    </div>
  );
}
