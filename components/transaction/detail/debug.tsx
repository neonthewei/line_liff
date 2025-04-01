interface DebugProps {
  info: {
    url: string;
    params: Record<string, string>;
  };
  lineId?: string;
  lineType?: string;
}

export function Debug({ info, lineId, lineType }: DebugProps) {
  return (
    <>
      {/* LINE 參數顯示 */}
      {(lineId || lineType) && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">LINE 參數資訊</p>
            <div className="h-px flex-1 bg-gray-200 mx-2"></div>
          </div>
          <div className="space-y-2">
            {lineId && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">記錄 ID</span>
                <span className="text-sm font-medium text-gray-700">
                  {lineId}
                </span>
              </div>
            )}
            {lineType && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">交易類型</span>
                <span className="text-sm font-medium text-gray-700">
                  {lineType}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 調試信息 */}
      <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-yellow-700">調試信息</p>
          <div className="h-px flex-1 bg-yellow-200 mx-2"></div>
        </div>
        <div className="space-y-2 overflow-hidden">
          <div className="flex flex-col">
            <span className="text-sm text-yellow-700">完整 URL:</span>
            <span className="text-xs text-yellow-600 break-all">
              {info.url}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-yellow-700">解析參數:</span>
            <div className="text-xs text-yellow-600">
              {Object.entries(info.params).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span>{key}:</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
