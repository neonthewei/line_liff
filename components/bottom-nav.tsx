"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, BarChart2, User } from "lucide-react"
import { useState, useEffect } from "react"

export default function BottomNav() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    // 監聽鍵盤事件
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'p' || event.key === 'P') {
        setIsVisible(prev => !prev)
      }
    }
    
    // 添加事件監聽器
    window.addEventListener('keydown', handleKeyDown)
    
    // 清理事件監聽器
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
  
  // 如果不可見，則不渲染導航欄
  if (!isVisible) {
    return null
  }
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="container mx-auto max-w-md flex justify-around">
        <Link 
          href="/" 
          className={`flex flex-col items-center py-3 px-5 ${
            pathname === "/" ? "text-green-500" : "text-gray-500"
          }`}
          aria-label="首頁"
          tabIndex={0}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs mt-1">首頁</span>
        </Link>
        
        <Link 
          href="/analyse" 
          className={`flex flex-col items-center py-3 px-5 ${
            pathname === "/analyse" ? "text-green-500" : "text-gray-500"
          }`}
          aria-label="分析"
          tabIndex={0}
        >
          <BarChart2 className="w-6 h-6" />
          <span className="text-xs mt-1">分析</span>
        </Link>

        <Link 
          href="/profile" 
          className={`flex flex-col items-center py-3 px-5 ${
            pathname === "/profile" ? "text-green-500" : "text-gray-500"
          }`}
          aria-label="我的"
          tabIndex={0}
        >
          <User className="w-6 h-6" />
          <span className="text-xs mt-1">我的</span>
        </Link>
      </div>
    </div>
  )
} 