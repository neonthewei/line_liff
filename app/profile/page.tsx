"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initializeLiff } from "@/utils/liff";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronRight, BookOpen, MessageSquare, Download, CreditCard, MessageCircle } from "lucide-react";
import Link from "next/link";

interface UserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        // 檢測是否在 LINE 內部瀏覽器中
        const isInLineInternalBrowser = typeof window !== 'undefined' && 
          window.navigator.userAgent.includes('Line') && 
          !window.navigator.userAgent.includes('LIFF');
        
        // 初始化 LIFF
        const isInitialized = await initializeLiff();
        
        if (!isInitialized) {
          throw new Error("LIFF 初始化失敗");
        }
        
        // 如果在 LINE 內部瀏覽器中，嘗試從 localStorage 獲取用戶資料
        if (isInLineInternalBrowser) {
          const storedUserId = localStorage.getItem('userId');
          const storedDisplayName = localStorage.getItem('displayName');
          const storedPictureUrl = localStorage.getItem('pictureUrl');
          
          if (storedUserId && storedDisplayName) {
            setUserProfile({
              userId: storedUserId,
              displayName: storedDisplayName,
              pictureUrl: storedPictureUrl || undefined
            });
            setIsLoading(false);
            return;
          }
        }
        
        // 檢查是否已登入
        if (!window.liff.isLoggedIn()) {
          // 如果未登入，則導向登入
          window.liff.login();
          return;
        }
        
        // 用戶已登入，獲取用戶資料
        const profile = await window.liff.getProfile();
        
        if (profile && profile.userId) {
          setUserProfile(profile);
          
          // 存儲用戶資料到 localStorage
          try {
            localStorage.setItem('userId', profile.userId);
            localStorage.setItem('displayName', profile.displayName);
            if (profile.pictureUrl) {
              localStorage.setItem('pictureUrl', profile.pictureUrl);
            }
          } catch (storageError) {
            console.error("Failed to save user profile to localStorage:", storageError);
          }
        } else {
          throw new Error("無法獲取用戶資料");
        }
      } catch (error) {
        console.error("獲取用戶資料失敗", error);
        setError("無法獲取用戶資料，請確保您已登入LINE並授權應用程式");
      } finally {
        setIsLoading(false);
      }
    };

    initLiff();
  }, []);

  // 功能項目列表
  const menuItems = [
    {
      id: "tutorial",
      name: "新手教學",
      icon: <BookOpen className="h-5 w-5 text-gray-600" />,
      href: "/tutorial",
    },
    {
      id: "feedback",
      name: "回饋表單",
      icon: <MessageSquare className="h-5 w-5 text-gray-600" />,
      href: "/feedback",
    },
    {
      id: "export",
      name: "匯出帳本",
      icon: <Download className="h-5 w-5 text-gray-600" />,
      href: "/export",
    },
    {
      id: "payment",
      name: "付費狀況",
      icon: <CreditCard className="h-5 w-5 text-gray-600" />,
      href: "/payment",
    },
    {
      id: "replies",
      name: "個性回覆",
      icon: <MessageCircle className="h-5 w-5 text-gray-600" />,
      href: "/replies",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 p-4 rounded-lg max-w-md w-full">
          <p className="text-red-600 text-center">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 用戶資料區塊 */}
      <div className="bg-white p-6 flex flex-col items-center">
        <Avatar className="h-24 w-24 mb-4">
          {userProfile?.pictureUrl ? (
            <AvatarImage src={userProfile.pictureUrl} alt={userProfile.displayName} />
          ) : (
            <AvatarFallback className="bg-gray-200 text-gray-600 text-xl">
              {userProfile?.displayName?.charAt(0) || "U"}
            </AvatarFallback>
          )}
        </Avatar>
        <h1 className="text-xl font-semibold mb-1">{userProfile?.displayName}</h1>
        <p className="text-sm text-gray-500 mb-2">
          已記帳 {localStorage.getItem('daysUsed') || "0"} 天
        </p>
      </div>

      {/* 功能選單區塊 */}
      <div className="flex-1 p-4">
        <div className="bg-white rounded-lg overflow-hidden shadow-sm">
          {menuItems.map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                index !== menuItems.length - 1 ? "border-b border-gray-100" : ""
              }`}
              aria-label={item.name}
              tabIndex={0}
            >
              <div className="flex items-center">
                {item.icon}
                <span className="ml-3 text-gray-700">{item.name}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
} 