import React from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { ViewType } from './month-selector';

type ChartComponentsProps = {
  categoryData: any[];
  dailyData: any[];
  activeTab: "expense" | "income";
  activeView: ViewType;
  summary: {
    totalExpense: number;
    totalIncome: number;
    balance: number;
    averageExpense: number;
    averageIncome: number;
    averageBalance: number;
  };
  dataTimestamp: number;
  COLORS: string[];
};

const ChartComponents: React.FC<ChartComponentsProps> = ({
  categoryData,
  dailyData,
  activeTab,
  activeView,
  summary,
  dataTimestamp,
  COLORS
}) => {
  return (
    <>
      <div className="bg-white rounded-2xl p-4 mb-5 shadow-sm">
        <h2 className="text-lg font-medium">類別分佈</h2>
        <div className="text-xs text-gray-500 mb-3 pb-2 border-b border-gray-100">
          {activeTab === "expense" ? "支出類別佔比分析" : "收入類別佔比分析"}
          {activeView === "year" && " (全年)"}
        </div>
        
        {categoryData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300} className="mt-0">
              <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }} key={`pie-chart-${activeTab}-${dataTimestamp}`}>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  innerRadius={70}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={false}
                  paddingAngle={0}
                  isAnimationActive={false}
                  strokeWidth={0}
                  minAngle={1}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => {
                    const total = activeTab === "expense" ? summary.totalExpense : summary.totalIncome;
                    return `${((value / (total || 1)) * 100).toFixed(1)}%`;
                  }} 
                  labelFormatter={(name) => `${name}`}
                  isAnimationActive={false}
                />
                {/* 中間顯示總金額 */}
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-sm font-medium"
                >
                  <tspan x="50%" dy="-15" fontSize="14" fill="#666">
                    {activeView === "month" ? 
                      (activeTab === "expense" ? "總支出" : "總收入") : 
                      (activeTab === "expense" ? "年度總支出" : "年度總收入")
                    }
                  </tspan>
                  <tspan x="50%" dy="28" fontSize="20" fontWeight="bold" fill="#333">
                    ${activeTab === "expense" ? summary.totalExpense.toFixed(0) : summary.totalIncome.toFixed(0)}
                  </tspan>
                </text>
              </PieChart>
            </ResponsiveContainer>
            
            {/* 日均支出/收入 - 小字顯示在圓餅圖下方 */}
            <div className="text-center text-xs text-gray-500 mt-0 mb-2">
              {activeView === "month" ? 
                `日均${activeTab === "expense" ? "支出" : "收入"}: $${activeTab === "expense" ? summary.averageExpense.toFixed(2) : summary.averageIncome.toFixed(2)}` :
                `月均${activeTab === "expense" ? "支出" : "收入"}: $${activeTab === "expense" ? summary.averageExpense.toFixed(2) : summary.averageIncome.toFixed(2)}`
              }
            </div>
            
            {/* 自定義圖例 */}
            <div className="mt-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {categoryData.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded mr-2 flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">{entry.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {(entry.value / (activeTab === "expense" ? summary.totalExpense : summary.totalIncome) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p>無數據</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-medium">
          {activeView === "month" ? "每日分佈" : "每月分佈"}
        </h2>
        
        {dailyData.length > 0 ? (
          <>
            <div className="text-xs text-gray-500 mb-8 pb-2 border-b border-gray-100">
              {activeView === "month" 
                ? (activeTab === "expense" ? "每日支出分佈圖表" : "每日收入分佈圖表")
                : (activeTab === "expense" ? "每月支出分佈圖表" : "每月收入分佈圖表")
              }
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={dailyData}
                margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                key={`bar-chart-${activeTab}-${dataTimestamp}`}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey={activeView === "month" ? "day" : "month"} 
                  tick={{ fontSize: 12 }}
                  interval="preserveEnd"
                  tickMargin={10}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis 
                  hide={true}
                  domain={[0, 'dataMax + 5']}
                />
                <Bar 
                  dataKey="percentage" 
                  fill="#10b981"
                  isAnimationActive={false}
                  unit="%"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={20}
                  name={activeTab === "expense" ? "支出佔比" : "收入佔比"}
                />
              </BarChart>
            </ResponsiveContainer>
            
            {/* 趨勢摘要 */}
            <div className="mt-6">
              <div className="grid grid-cols-2 gap-x-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="text-xs text-gray-500 mb-2">
                      {activeView === "month" ? "最高日" : "最高月"}
                    </div>
                    <div className="text-xl font-bold mb-1">
                      {dailyData.reduce((max, item) => item.percentage > max.percentage ? item : max, dailyData[0])[activeView === "month" ? "day" : "month"]}
                    </div>
                    <div className="text-green-500 font-medium text-lg">
                      {dailyData.reduce((max, item) => item.percentage > max.percentage ? item : max, dailyData[0]).percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="text-xs text-gray-500 mb-2">
                      {activeView === "month" ? "最低日" : "最低月"}
                    </div>
                    <div className="text-xl font-bold mb-1">
                      {dailyData.filter(item => item.percentage > 0).reduce((min, item) => 
                        item.percentage < min.percentage ? item : min, 
                        dailyData.find(item => item.percentage > 0) || dailyData[0]
                      )[activeView === "month" ? "day" : "month"]}
                    </div>
                    <div className="text-green-500 font-medium text-lg">
                      {dailyData.filter(item => item.percentage > 0).reduce((min, item) => 
                        item.percentage < min.percentage ? item : min, 
                        dailyData.find(item => item.percentage > 0) || dailyData[0]
                      ).percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p>無數據</p>
          </div>
        )}
      </div>
    </>
  );
};

export default ChartComponents; 