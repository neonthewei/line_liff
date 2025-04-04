"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initializeLiff } from "@/utils/liff";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronRight,
  BookOpen,
  MessageSquare,
  Download,
  CreditCard,
  MessageCircle,
  Copy,
  CheckCircle,
  Target,
  Edit2,
} from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const [goal, setGoal] = useState<string>("");
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState<string>("");
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "u") {
        setShowOverlay(false);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  useEffect(() => {
    // 從 localStorage 獲取目標
    const savedGoal = localStorage.getItem("userGoal");
    if (savedGoal) {
      setGoal(savedGoal);
    }

    const initLiff = async () => {
      try {
        // 檢測是否在 LINE 內部瀏覽器中
        const isInLineInternalBrowser =
          typeof window !== "undefined" &&
          window.navigator.userAgent.includes("Line") &&
          !window.navigator.userAgent.includes("LIFF");

        console.log("Is in LINE internal browser:", isInLineInternalBrowser);

        // 初始化 LIFF
        const isInitialized = await initializeLiff();

        if (!isInitialized) {
          throw new Error("LIFF 初始化失敗");
        }

        // 如果在 LINE 內部瀏覽器中，嘗試從 localStorage 獲取用戶資料
        if (isInLineInternalBrowser) {
          console.log(
            "In LINE internal browser, trying to get user data from localStorage"
          );
          const storedUserId = localStorage.getItem("userId");
          const storedDisplayName = localStorage.getItem("displayName");
          const storedPictureUrl = localStorage.getItem("pictureUrl");

          if (storedUserId && storedDisplayName) {
            console.log(
              "Found stored user data:",
              storedUserId,
              storedDisplayName
            );
            setUserProfile({
              userId: storedUserId,
              displayName: storedDisplayName,
              pictureUrl: storedPictureUrl || undefined,
            });
            setIsLoading(false);
            return;
          } else {
            console.log("No stored user data found in localStorage");

            // 嘗試從 LIFF context 獲取用戶 ID
            try {
              if (window.liff && typeof window.liff.getContext === "function") {
                const context = window.liff.getContext();
                console.log("LIFF Context for user ID:", context);

                if (context && context.userId) {
                  console.log("Found user ID in LIFF context:", context.userId);
                  // 如果有 userId 但沒有完整資料，可以嘗試獲取完整資料
                  try {
                    const profile = await window.liff.getProfile();
                    if (profile && profile.userId) {
                      setUserProfile(profile);

                      // 存儲用戶資料到 localStorage
                      localStorage.setItem("userId", profile.userId);
                      localStorage.setItem("displayName", profile.displayName);
                      if (profile.pictureUrl) {
                        localStorage.setItem("pictureUrl", profile.pictureUrl);
                      }
                      setIsLoading(false);
                      return;
                    }
                  } catch (profileError) {
                    console.error(
                      "Error getting profile from LIFF:",
                      profileError
                    );
                  }
                }
              }
            } catch (contextError) {
              console.error("Error getting LIFF context:", contextError);
            }
          }
        }

        // 檢查是否已登入
        if (!window.liff.isLoggedIn()) {
          // 如果未登入，則導向登入
          console.log("User not logged in, redirecting to login");
          window.liff.login();
          return;
        }

        // 用戶已登入，獲取用戶資料
        console.log("User logged in, getting profile");
        try {
          // 先檢查 access token 是否有效
          try {
            const token = window.liff.getAccessToken();
            if (!token) {
              console.log("Access token does not exist, redirecting to login");
              window.liff.login();
              return;
            }
            console.log("Access token exists, continuing to get user profile");
          } catch (tokenError) {
            console.error(
              "Failed to get access token, may be expired",
              tokenError
            );
            console.log("Attempting to login again");
            window.liff.login();
            return;
          }

          const profile = await window.liff.getProfile();
          console.log("Successfully got user profile:", profile);

          if (profile && profile.userId) {
            setUserProfile(profile);

            // 存儲用戶資料到 localStorage
            try {
              localStorage.setItem("userId", profile.userId);
              localStorage.setItem("displayName", profile.displayName);
              if (profile.pictureUrl) {
                localStorage.setItem("pictureUrl", profile.pictureUrl);
              }
              console.log("Saved user profile to localStorage");
            } catch (storageError) {
              console.error(
                "Failed to save user profile to localStorage:",
                storageError
              );
            }
          } else {
            throw new Error("無法獲取用戶資料");
          }
        } catch (profileError) {
          console.error("Failed to get user profile:", profileError);
          setError("無法獲取用戶資料，請確保您已登入LINE並授權應用程式");
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

  // 複製用戶 ID 到剪貼簿
  const handleCopyUserId = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    if (userProfile?.userId) {
      navigator.clipboard
        .writeText(userProfile.userId)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000); // 2秒後重置複製狀態
        })
        .catch((err) => {
          console.error("無法複製到剪貼簿:", err);
        });
    }
  };

  // 保存新目標
  const handleSaveGoal = () => {
    if (newGoal.trim()) {
      setGoal(newGoal.trim());
      localStorage.setItem("userGoal", newGoal.trim());
    }
    setIsEditingGoal(false);
  };

  // 取消編輯目標
  const handleCancelEditGoal = () => {
    setNewGoal(goal);
    setIsEditingGoal(false);
  };

  // 開始編輯目標
  const handleStartEditGoal = () => {
    setNewGoal(goal);
    setIsEditingGoal(true);
  };

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
    <main className="container mx-auto max-w-md p-5 min-h-screen bg-white relative">
      {showOverlay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <h2 className="text-4xl font-bold text-white">開發中！</h2>
        </div>
      )}

      {/* 用戶資料區塊 */}
      <div className="bg-white flex flex-col items-center">
        <Avatar className="h-24 w-24 mb-4">
          {userProfile?.pictureUrl ? (
            <AvatarImage
              src={userProfile.pictureUrl}
              alt={userProfile.displayName}
            />
          ) : (
            <AvatarFallback className="bg-gray-200 text-gray-600 text-xl">
              {userProfile?.displayName?.charAt(0) || "U"}
            </AvatarFallback>
          )}
        </Avatar>
        <h1 className="text-xl font-semibold mb-1">
          {userProfile?.displayName}
        </h1>

        {/* 用戶 ID 和複製按鈕 */}
        <div className="flex items-center mb-6 bg-gray-50 rounded-full px-3 py-1">
          <p className="text-xs text-gray-500 mr-2 truncate max-w-[180px]">
            {userProfile?.userId}
          </p>
          <button
            onClick={handleCopyUserId}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-gray-400 hover:text-green-500 transition-colors focus:outline-none"
            aria-label="複製用戶ID"
            tabIndex={0}
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* 已記帳天數 - 使用綠色設計，圓角小一點 */}
        <div className="bg-green-500 text-white px-5 py-2 rounded-xl shadow-sm flex items-center justify-center mb-4">
          <span className="text-sm font-medium">已記帳 </span>
          <span className="text-xl font-bold mx-1">
            {localStorage.getItem("daysUsed") || "0"}
          </span>
          <span className="text-sm font-medium"> 天</span>
        </div>

        {/* 目標設定 - 特別設計 */}
        <div className="w-full max-w-md bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4 mb-6 border border-green-100 relative overflow-hidden">
          {/* 裝飾元素 */}
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br from-green-200/30 to-blue-200/30"></div>
          <div className="absolute -bottom-8 -left-8 w-20 h-20 rounded-full bg-gradient-to-tr from-green-200/20 to-blue-200/20"></div>

          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center">
              <div className="bg-white p-2 rounded-full mr-3">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <h2 className="text-base font-semibold text-gray-700">
                我的記帳目標
              </h2>
            </div>
          </div>

          {isEditingGoal ? (
            <div className="relative z-10">
              <textarea
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="設定您的記帳目標..."
                className="w-full p-3 border border-green-100 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                rows={3}
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleCancelEditGoal}
                  className="px-4 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveGoal}
                  className="px-4 py-1.5 text-xs text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div
              className="bg-white p-4 rounded-lg relative z-10 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={handleStartEditGoal}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleStartEditGoal()}
              aria-label="點擊編輯目標"
            >
              {goal ? (
                <p className="text-sm text-gray-600">{goal}</p>
              ) : (
                <div className="flex flex-col items-center justify-center py-3">
                  <p className="text-sm text-gray-500 text-center mb-2">
                    尚未設定目標
                  </p>
                  <button className="px-4 py-1.5 text-xs text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-colors">
                    立即設定
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 功能選單區塊 */}
      <div className="flex-1 pt-0">
        <div className="bg-white rounded-lg overflow-hidden">
          {menuItems.map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center justify-between p-4 bg-gray-50 mb-2 rounded-2xl hover:bg-gray-100 transition-colors`}
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
    </main>
  );
}
