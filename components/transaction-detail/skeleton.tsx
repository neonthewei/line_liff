import { Skeleton as UISkeleton } from "@/components/ui/skeleton";

export function Skeleton() {
  return (
    <div className="w-full max-w-md mx-auto pb-6 relative z-10">
      <div className="space-y-4 px-[20px] mt-[20px]">
        {/* 屬性和類型卡片 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          {/* 屬性 (交易類型) */}
          <div className="flex items-center justify-between">
            <UISkeleton className="h-6 w-16 animate-pulse-color" />
            <div className="flex gap-2">
              <UISkeleton className="h-9 w-20 rounded-xl animate-pulse-color" />
              <UISkeleton className="h-9 w-20 rounded-xl animate-pulse-color" />
            </div>
          </div>

          {/* 分隔線 */}
          <div className="border-t border-gray-100"></div>

          {/* 類型 */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <UISkeleton className="h-6 w-16 animate-pulse-color" />
              <UISkeleton className="h-8 w-28 rounded-lg animate-pulse-color" />
            </div>
          </div>
        </div>

        {/* 金額、日期卡片 */}
        <div className="bg-white rounded-2xl shadow-sm space-y-4 p-4">
          {/* 金額 */}
          <div className="flex items-center justify-between">
            <UISkeleton className="h-6 w-16 animate-pulse-color" />
            <div className="flex items-center">
              <UISkeleton className="h-8 w-32 rounded-lg animate-pulse-color" />
            </div>
          </div>

          <div className="border-t border-gray-100"></div>

          {/* 日期 */}
          <div className="flex items-center justify-between">
            <UISkeleton className="h-6 w-16 animate-pulse-color" />
            <div className="flex items-center">
              <UISkeleton className="h-8 w-36 rounded-lg animate-pulse-color" />
            </div>
          </div>
        </div>

        {/* 備註卡片 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col space-y-2">
            <UISkeleton className="h-6 w-16 animate-pulse-color" />
            <UISkeleton className="h-[42px] w-full rounded-lg animate-pulse-color" />
          </div>
        </div>

        {/* 按鈕區域 */}
        <div className="space-y-4 mt-8">
          <UISkeleton className="h-[52px] w-full rounded-2xl animate-pulse-color" />
          <UISkeleton className="h-[52px] w-full rounded-2xl animate-pulse-color" />
        </div>
      </div>
    </div>
  );
}
