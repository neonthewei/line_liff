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
  onSaveNewCategory?: (category: string) => void;
  getCategoryTransactionCount?: (category: string) => Promise<number>;
}

// 添加DeleteModal组件
interface DeleteModalProps {
  category: string;
  transactionCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

// 删除确认对话框组件
function DeleteModal({
  category,
  transactionCount,
  onConfirm,
  onCancel,
}: DeleteModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl transform animate-scaleInStatic"
        onClick={(e) => e.stopPropagation()} // 防止点击内容区域时关闭窗口
      >
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <X className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            確定要刪除類型嗎？
          </h3>
          <p className="text-sm text-red-500 font-medium">
            注意：屬於此類型的 {transactionCount} 筆記錄也將被刪除。
          </p>
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

export function Category({
  categories,
  selectedCategory,
  isEditMode,
  onSelectCategory,
  onToggleEditMode,
  onDeleteCategory,
  onAddCategory,
  onSaveNewCategory,
  getCategoryTransactionCount,
}: CategoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  // 添加删除确认相关状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState("");
  const [transactionCount, setTransactionCount] = useState(0);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAddClick = () => {
    // Tell the parent component we're starting to add a category
    onAddCategory();
    // Then update our local state
    setIsAddingCategory(true);
    setNewCategory("");
  };

  const handleSaveNewCategory = () => {
    if (newCategory.trim() !== "") {
      onSaveNewCategory?.(newCategory.trim());
    }
    setIsAddingCategory(false);
  };

  const handleCancelAddCategory = () => {
    setIsAddingCategory(false);
    setNewCategory("");
    // Notify parent component if needed
  };

  // 修改处理删除点击的函数，添加获取交易数量的参数
  const handleDeleteClick = async (category: string) => {
    setCategoryToDelete(category);

    // 查询交易数量
    try {
      // 这里只设置为准备删除的状态，交易数量会由父组件通过回调函数提供
      const count = (await getCategoryTransactionCount?.(category)) || 0;
      setTransactionCount(count);
    } catch (error) {
      console.error("Error checking category transactions count:", error);
      setTransactionCount(0);
    }

    setShowDeleteModal(true);
  };

  // 确认删除
  const confirmDelete = () => {
    if (categoryToDelete) {
      onDeleteCategory(categoryToDelete);
    }
    setShowDeleteModal(false);
  };

  // 取消删除
  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  // 新增處理類型選擇的函數
  const handleCategorySelection = (category: string) => {
    onSelectCategory(category);
    setIsExpanded(false); // 選擇類型後收起選單
  };

  return (
    <div className="flex flex-col">
      {/* 删除确认弹窗 */}
      {showDeleteModal && (
        <DeleteModal
          category={categoryToDelete}
          transactionCount={transactionCount}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

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
                <div key={index} className="relative">
                  {isEditMode ? (
                    // 編輯模式下點擊刪除類別
                    <button
                      className={`w-full py-2 rounded-xl text-center transition-all duration-150 ${
                        category === selectedCategory
                          ? "bg-[#22c55e] text-white cursor-not-allowed"
                          : "bg-gray-200 text-gray-600 active:bg-gray-300"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        // 只有非选中类型才能删除
                        if (category !== selectedCategory) {
                          handleDeleteClick(category);
                        }
                      }}
                      aria-label={`刪除${category}類型`}
                      disabled={category === selectedCategory}
                      title={category} // 添加tooltip以顯示完整類型名稱
                    >
                      <span className="block break-words px-1 text-sm">
                        {category}
                      </span>
                      {/* 不在當前選中的類別上顯示刪除圖標 */}
                      {category !== selectedCategory && (
                        <X
                          size={18}
                          className="absolute top-1/2 -translate-y-1/2 right-2 hover:text-red-500 transition-colors duration-200"
                        />
                      )}
                    </button>
                  ) : (
                    // 非編輯模式下點擊選擇類別
                    <button
                      className={`w-full py-2 rounded-xl text-center transition-all duration-150 ${
                        category === selectedCategory
                          ? "bg-[#22c55e] text-white"
                          : "bg-gray-200 text-gray-600 active:bg-gray-300"
                      }`}
                      onClick={() => handleCategorySelection(category)}
                      title={category} // 添加tooltip以顯示完整類型名稱
                    >
                      <span className="block break-words px-1 text-sm">
                        {category}
                      </span>
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
                onChange={(e) => setNewCategory(e.target.value)}
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
