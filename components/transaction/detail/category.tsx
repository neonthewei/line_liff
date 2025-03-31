import { useState } from "react";
import { ChevronDown, ChevronUp, Edit, Check, X, Plus } from "lucide-react";

interface CategoryProps {
  categories: string[];
  selectedCategory: string;
  isEditMode: boolean;
  onSelectCategory: (category: string) => void;
  onToggleEditMode: () => void;
  onDeleteCategory: (category: string) => void;
  onAddCategory: () => void;
}

export function Category({
  categories,
  selectedCategory,
  isEditMode,
  onSelectCategory,
  onToggleEditMode,
  onDeleteCategory,
  onAddCategory,
}: CategoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAddClick = () => {
    setIsAddingCategory(true);
    setNewCategory("");
    onAddCategory();
  };

  const handleSaveNewCategory = () => {
    if (newCategory.trim() !== "") {
      // 調用父組件傳入的方法來保存新類別
      // 這個函數通常會在父組件中實現
    }
    setIsAddingCategory(false);
  };

  const handleCancelAddCategory = () => {
    setIsAddingCategory(false);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-gray-600 pl-2">類型</span>
        <div
          className="flex items-center cursor-pointer px-2 py-1 rounded-lg"
          onClick={handleToggleExpand}
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleToggleExpand()}
          aria-label="展開類型選單"
        >
          <span className="text-gray-800">{selectedCategory}</span>
          {isExpanded ? (
            <ChevronUp className="ml-2 text-gray-400" />
          ) : (
            <ChevronDown className="ml-2 text-gray-400" />
          )}
        </div>
      </div>

      {/* 類別選擇器 */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
        }`}
      >
        {!isAddingCategory ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {categories.map((category, index) => (
                <div
                  key={index}
                  className={`relative py-2 rounded-xl text-center ${
                    category === selectedCategory
                      ? "bg-[#22c55e] text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isEditMode ? (
                    // 編輯模式下點擊刪除類別
                    <button
                      className="w-full h-full flex items-center justify-center active:bg-gray-300 active:scale-[0.98] transition-all duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCategory(category);
                      }}
                      aria-label={`刪除${category}類型`}
                    >
                      <span>{category}</span>
                      {/* 不在當前選中的類別上顯示刪除圖標 */}
                      {category !== selectedCategory && (
                        <X
                          size={18}
                          className="absolute right-2 hover:text-red-500 transition-colors duration-200"
                        />
                      )}
                    </button>
                  ) : (
                    // 非編輯模式下點擊選擇類別
                    <button
                      className="w-full h-full active:bg-opacity-80 active:scale-[0.98] transition-all duration-150"
                      onClick={() => onSelectCategory(category)}
                    >
                      {category}
                    </button>
                  )}
                </div>
              ))}

              {/* 新增類別按鈕，僅在編輯模式顯示 */}
              {isEditMode && (
                <button
                  className="py-2 rounded-xl text-center bg-green-100 text-green-600 flex items-center justify-center transition-all duration-300 ease-in-out active:bg-green-200"
                  onClick={handleAddClick}
                >
                  <Plus size={16} className="mr-1" />
                  <span>新增</span>
                </button>
              )}
            </div>

            {/* 編輯按鈕 - 移至底部並佔滿整行 */}
            <button
              className={`w-full py-2 rounded-xl flex items-center justify-center transition-all duration-300 ease-in-out ${
                isEditMode
                  ? "bg-green-100 text-green-600 active:bg-green-200"
                  : "bg-gray-100 text-gray-600 active:bg-gray-200"
              }`}
              onClick={onToggleEditMode}
            >
              <div className="flex items-center justify-center">
                {isEditMode ? (
                  <>
                    <Check size={16} className="mr-1" />
                    <span>完成</span>
                  </>
                ) : (
                  <>
                    <Edit size={16} className="mr-1" />
                    <span>編輯</span>
                  </>
                )}
              </div>
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                }}
                placeholder="輸入新類型"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveNewCategory()}
              />
              <div className="flex space-x-2">
                <button
                  className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg transition-all duration-150 active:bg-green-600 active:scale-[0.98]"
                  onClick={handleSaveNewCategory}
                >
                  確定
                </button>
                <button
                  className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg transition-all duration-150 active:bg-gray-300 active:scale-[0.98]"
                  onClick={handleCancelAddCategory}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
