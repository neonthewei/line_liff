"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
import { ScrollArea } from "@/components/shared/ui/scroll-area";

// Spinner 組件（簡易實現）
const Spinner = () => (
  <div
    className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
    role="status"
  >
    <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
      加載中...
    </span>
  </div>
);

// Supabase 設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || "";

// 創建一個單一的 Supabase 客戶端實例
const supabaseClient =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// 開發者模式設置
const DEV_MODE = process.env.NODE_ENV === "development";
const DEV_LINE_ID = "U1234567890abcdef"; // 開發測試用的LINE ID

// LIFF 類型聲明
declare global {
  interface Window {
    liff: any; // LIFF SDK interface
  }
}

// 檢查是否在瀏覽器環境
const isBrowser = typeof window !== "undefined";

// 安全的 localStorage 訪問函數
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (isBrowser) {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (isBrowser) {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (isBrowser) {
      localStorage.removeItem(key);
    }
  },
};

// 簡單的 REST API 客戶端，使用 JWT 進行認證
const RESTClient = {
  // 解析 JWT 獲取用戶資訊
  parseJwt: (jwt: string) => {
    try {
      const parts = jwt.split(".");
      if (parts.length !== 3) return null;

      return JSON.parse(atob(parts[1]));
    } catch (error) {
      console.error("JWT 解析錯誤:", error);
      return null;
    }
  },

  // 執行 GET 請求
  get: async (url: string, jwt: string) => {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
          apikey: supabaseKey || "",
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      return { data, error: response.ok ? null : data };
    } catch (error) {
      return { data: null, error };
    }
  },

  // 執行 POST 請求
  post: async (url: string, body: any, jwt: string) => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          apikey: supabaseKey || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return { data, error: response.ok ? null : data };
    } catch (error) {
      return { data: null, error };
    }
  },

  // 建構完整的 Supabase REST URL
  buildUrl: (path: string, queryParams: Record<string, any> = {}) => {
    const url = new URL(`${supabaseUrl}/rest/v1/${path}`);

    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    return url.toString();
  },
};

// 初始化 LIFF SDK
const initializeLiff = async () => {
  if (typeof window === "undefined" || !window.liff) {
    console.error("LIFF SDK not loaded");
    return false;
  }

  try {
    // LIFF ID 應從環境變量獲取
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";
    if (!liffId) {
      console.error("LIFF ID is not defined");
      return false;
    }

    await window.liff.init({
      liffId: liffId,
    });

    console.log("LIFF initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize LIFF:", error);
    return false;
  }
};

// 使用 LIFF 登入
const login = () => {
  if (typeof window !== "undefined" && window.liff) {
    console.log("Redirecting to LINE login...");
    window.liff.login();
  } else {
    console.error("LIFF is not initialized");
  }
};

export default function AuthTestPage() {
  const searchParams = useSearchParams();
  const callbackStatus = searchParams.get("callback");
  const [logs, setLogs] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [jwtToken, setJwtToken] = useState<string>("");
  const [testResult, setTestResult] = useState<any>(null);
  const [isLiffInitialized, setIsLiffInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDevModeIndicator, setShowDevModeIndicator] = useState(false);

  // 添加日誌
  const addLog = (message: string) => {
    setLogs((prevLogs) => [
      ...prevLogs,
      `${new Date().toISOString()}: ${message}`,
    ]);
    console.log(message);
  };

  // 處理回調
  useEffect(() => {
    if (callbackStatus === "success") {
      addLog("從 Auth0 回調成功返回");
    }
  }, [callbackStatus]);

  // 初始化 LIFF 和獲取用戶資料
  useEffect(() => {
    const setupLiff = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 檢查是否處於開發者模式
        addLog(`開發者模式: ${DEV_MODE ? "啟用" : "停用"}`);

        // 開發者模式下，自動啟用快速登入
        if (DEV_MODE) {
          // 檢查是否用戶明確停用了開發者快速登入模式
          const explicitlyDisabled =
            safeLocalStorage.getItem("devModeExplicitlyDisabled") === "true";

          // 如果用戶沒有明確停用，則自動啟用
          if (!explicitlyDisabled) {
            // 自動設置為啟用狀態
            safeLocalStorage.setItem("devModeActive", "true");
            addLog("自動啟用開發者快速登入模式");
          }

          // 檢查開發者快速登入模式狀態
          const isDeveloperModeActive =
            safeLocalStorage.getItem("devModeActive") === "true";
          addLog(
            `開發者快速登入模式: ${isDeveloperModeActive ? "啟用" : "停用"}`
          );

          if (isDeveloperModeActive) {
            // 從localStorage獲取開發用的LINE ID，如果沒有則使用默認值
            const devLineId =
              safeLocalStorage.getItem("devLineId") || DEV_LINE_ID;
            addLog(`使用開發用 LINE ID: ${devLineId}`);

            // 使用開發者 LINE ID 生成 JWT
            generateJwtFromLineId(devLineId);
            return;
          }
        }

        // 檢測是否在 LINE 內部瀏覽器中
        const isInLineInternalBrowser =
          typeof window !== "undefined" &&
          window.navigator.userAgent.includes("Line") &&
          !window.navigator.userAgent.includes("LIFF");

        addLog(`是否在 LINE 內部瀏覽器: ${isInLineInternalBrowser}`);

        // 初始化 LIFF
        const isInitialized = await initializeLiff();
        setIsLiffInitialized(isInitialized);

        if (!isInitialized) {
          addLog("LIFF 初始化失敗");
          setError("LINE應用程式初始化失敗，請重新載入頁面");
          return;
        }

        // 檢查LIFF對象是否可用
        if (
          typeof window === "undefined" ||
          !window.liff ||
          typeof window.liff !== "object"
        ) {
          addLog("LIFF 對象不可用");
          setError("LIFF 對象不可用，請重新載入頁面");
          return;
        }

        // 如果在 LINE 內部瀏覽器中，嘗試獲取存儲的用戶 ID
        if (isInLineInternalBrowser) {
          addLog("在 LINE 內部瀏覽器中，檢查存儲的用戶 ID");

          const storedUserId = safeLocalStorage.getItem("userId");
          if (storedUserId) {
            addLog(`使用存儲的用戶 ID: ${storedUserId}`);

            // 繼續使用存儲的 ID 獲取 JWT
            generateJwtFromLineId(storedUserId);
          } else {
            addLog("未找到存儲的用戶 ID");

            // 嘗試從 LIFF context 獲取用戶 ID
            try {
              if (window.liff && typeof window.liff.getContext === "function") {
                const context = await window.liff.getContext();

                if (context && context.userId) {
                  addLog(`從 LIFF context 獲取用戶 ID: ${context.userId}`);
                  safeLocalStorage.setItem("userId", context.userId);

                  // 使用獲取的 ID 生成 JWT
                  generateJwtFromLineId(context.userId);
                } else {
                  setError("無法獲取您的 LINE ID，請確保您已授權應用程式");
                }
              }
            } catch (contextError) {
              addLog(`獲取 LIFF context 錯誤: ${contextError}`);
              setError("無法獲取 LINE 用戶資訊，請確保您已授權應用程式");
            }
          }

          return;
        }

        // 安全檢查 isLoggedIn 方法是否存在
        if (typeof window.liff.isLoggedIn !== "function") {
          addLog("window.liff.isLoggedIn 不是一個函數");
          setError("LIFF 功能不可用，請重新載入頁面");
          return;
        }

        // 檢查是否已登入
        if (!window.liff.isLoggedIn()) {
          addLog("用戶未登入，導向登入頁面");
          login();
          return;
        }

        // 用戶已登入，獲取用戶資料
        try {
          // 先檢查 access token 是否有效
          try {
            if (typeof window.liff.getAccessToken !== "function") {
              throw new Error("LIFF getAccessToken method is not available");
            }

            const token = window.liff.getAccessToken();
            if (!token) {
              addLog("Access token 不存在，重新登入");
              login();
              return;
            }
            addLog("Access token 存在，繼續獲取用戶資料");
          } catch (tokenError) {
            addLog("獲取 access token 失敗，可能已過期");
            login();
            return;
          }

          // 安全檢查 getProfile 方法是否存在
          if (typeof window.liff.getProfile !== "function") {
            throw new Error("LIFF getProfile method is not available");
          }

          const profile = await window.liff.getProfile();
          addLog(`成功獲取用戶資料: ${profile.displayName}`);

          if (profile && profile.userId) {
            // 存儲用戶 ID 到 localStorage
            safeLocalStorage.setItem("userId", profile.userId);
            addLog(`用戶 LINE ID: ${profile.userId}`);

            // 使用獲取的 LINE ID 生成 JWT
            generateJwtFromLineId(profile.userId);
          } else {
            throw new Error("無法獲取用戶資料");
          }
        } catch (profileError) {
          addLog(`獲取用戶資料失敗: ${profileError}`);

          // 檢查是否是 token 過期錯誤
          if (
            profileError instanceof Error &&
            profileError.message &&
            (profileError.message.includes("expired") ||
              profileError.message.includes("token"))
          ) {
            addLog("Access token 已過期，嘗試重新登入");
            login();
            return;
          }

          setError("無法獲取用戶資料，請確保您已登入LINE並授權應用程式");
        }
      } catch (error) {
        addLog(`LIFF 設置錯誤: ${error}`);
        setError("LINE應用程式初始化失敗，請重新載入頁面或確認您的網路連接");
      } finally {
        setIsLoading(false);
      }
    };

    // 只在客戶端運行
    if (isBrowser) {
      setupLiff();
    }
  }, []);

  // 添加開發者模式開關功能
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 使用"D"鍵切換開發者模式
      if (event.key === "d" || event.key === "D") {
        const currentState =
          safeLocalStorage.getItem("devModeActive") === "true";
        const newState = !currentState;
        safeLocalStorage.setItem("devModeActive", newState.toString());

        // 記錄用戶是否明確停用了開發者模式
        if (!newState) {
          safeLocalStorage.setItem("devModeExplicitlyDisabled", "true");
          addLog("用戶明確停用了開發者快速登入模式");
        } else {
          safeLocalStorage.removeItem("devModeExplicitlyDisabled");
        }

        // 如果開啟開發者模式，允許設置自定義LINE ID
        if (newState && DEV_MODE) {
          const savedDevLineId = safeLocalStorage.getItem("devLineId");
          const customLineId = prompt(
            "請輸入開發用的LINE ID（留空則使用默認值）:",
            savedDevLineId || DEV_LINE_ID
          );

          if (customLineId) {
            safeLocalStorage.setItem("devLineId", customLineId);
            addLog(`已設置開發用 LINE ID: ${customLineId}`);
          }
        }

        addLog(`開發者快速登入模式已${newState ? "啟用" : "停用"}`);
        window.location.reload(); // 重新載入頁面應用設置
      }
    };

    if (isBrowser) {
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
    return undefined;
  }, []);

  // 新增一個 useEffect 來安全地處理開發者模式指示器
  useEffect(() => {
    if (isBrowser && DEV_MODE) {
      const isDevModeActive = localStorage.getItem("devModeActive") === "true";
      setShowDevModeIndicator(isDevModeActive);
    }
  }, []);

  // 使用 LINE ID 生成 JWT
  const generateJwtFromLineId = async (lineId: string) => {
    try {
      addLog(`開始使用 LINE ID (${lineId}) 生成 JWT...`);

      // 使用後端 API 生成 JWT
      const response = await fetch("/api/generate-jwt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserData: {
            sub: lineId,
            name: "LINE User",
            picture: "https://profile.line-scdn.net/placeholder-image.png",
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`後端錯誤: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      setJwtToken(data.token);
      addLog("從後端獲取到 JWT");

      // 顯示 JWT 信息
      try {
        const payload = RESTClient.parseJwt(data.token);
        if (payload) {
          addLog(`JWT Payload: ${JSON.stringify(payload, null, 2)}`);

          // 提取用戶資訊
          const userData = {
            id: payload.sub,
            role: payload.role,
            email: payload.email,
            user_metadata: payload.user_metadata || {},
          };

          setUser(userData);

          addLog(`已從 JWT 提取用戶信息: ${payload.sub}`);
          addLog("使用外部 JWT 身份驗證成功！");

          // 成功獲取 JWT 後自動測試資料訪問
          setTimeout(() => {
            addLog("自動測試讀取受 RLS 保護的資料...");
            testRlsAccess(data.token, userData);
          }, 500);
        }
      } catch (e) {
        addLog(`無法解析 JWT 內容: ${e}`);
      }
    } catch (error: any) {
      addLog(`生成 JWT 錯誤: ${error.message}`);
      setError(`無法生成 JWT: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 測試 RLS 訪問受保護的資料
  const testRlsAccess = async (
    token: string = jwtToken,
    userData: any = user
  ) => {
    if (!token || !userData) {
      addLog("缺少 JWT 或用戶資料，無法測試");
      return;
    }

    try {
      addLog("測試讀取受 RLS 保護的資料...");
      addLog("使用自訂 JWT 直接調用 REST API");

      // 提取 LINE ID（從用戶元數據中）
      const lineId = userData.user_metadata?.line_id;

      if (!lineId) {
        addLog("用戶元數據中未找到 LINE ID");
        return;
      }

      addLog(`獲取 LINE ID: ${lineId}`);

      // 查詢 test_transactions 表，使用 user_id 欄位匹配 LINE ID
      const lineIdUrl = RESTClient.buildUrl("test_transactions", {
        select: "*",
        user_id: `eq.${lineId}`,
        limit: 10,
      });

      addLog(`查詢 URL: ${lineIdUrl}`);

      const { data: lineData, error: lineError } = await RESTClient.get(
        lineIdUrl,
        token
      );

      if (lineError) {
        addLog(`查詢錯誤: ${JSON.stringify(lineError)}`);
      } else {
        const recordCount = Array.isArray(lineData) ? lineData.length : 0;
        addLog(`查詢成功: 找到 ${recordCount} 筆記錄`);

        if (recordCount > 0) {
          addLog(`資料範例: ${JSON.stringify(lineData[0])}`);
        }

        setTestResult({
          userId: userData.id,
          lineId: lineId,
          results: lineData,
        });
      }
    } catch (error: any) {
      addLog(`測試 RLS 錯誤: ${error.message}`);
      if (error.stack) {
        addLog(`錯誤堆疊: ${error.stack}`);
      }
    }
  };

  // 登出
  const logout = async () => {
    try {
      addLog("正在登出...");

      // 清除用戶狀態
      setUser(null);
      setJwtToken("");
      setTestResult(null);

      // 嘗試使用 LIFF 登出
      if (isBrowser && window.liff && window.liff.isLoggedIn()) {
        window.liff.logout();
        addLog("已從 LINE 登出");
      }

      // 清除 localStorage
      safeLocalStorage.removeItem("userId");

      // 同時也登出 Supabase Auth（如果有）
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }

      addLog("已成功登出");
    } catch (error: any) {
      addLog(`登出錯誤: ${error.message}`);
    }
  };

  // 重新載入頁面
  const reload = () => {
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">LINE ID 自定義 JWT 授權測試</h1>

      {/* 主要內容區 */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        {isLoading ? (
          <Card className="p-6 flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="mb-4">
                <Spinner />
              </div>
              <p>正在初始化 LINE 應用程式並獲取用戶資訊...</p>
            </div>
          </Card>
        ) : error ? (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">發生錯誤</h2>
            <div className="bg-red-50 text-red-500 p-4 rounded-md mb-4">
              {error}
            </div>
            <Button onClick={reload} className="w-full">
              重新載入
            </Button>
          </Card>
        ) : (
          <>
            {user ? (
              <>
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    您的 LINE 帳號資訊
                  </h2>
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">
                        LINE ID:{" "}
                        <span className="font-mono">
                          {user.user_metadata?.line_id}
                        </span>
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-xs font-mono break-all">
                        JWT: {jwtToken}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">RLS 測試結果</h2>
                  <div className="space-y-4">
                    {testResult ? (
                      <div className="p-3 bg-muted rounded-md overflow-auto max-h-60">
                        <pre className="text-xs">
                          {JSON.stringify(testResult, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        正在獲取受保護的資料...
                      </p>
                    )}

                    <Button
                      className="w-full"
                      variant="destructive"
                      onClick={logout}
                    >
                      登出
                    </Button>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">使用 LINE 登入</h2>
                <div className="space-y-4">
                  <p className="text-sm">
                    請使用您的 LINE 帳號登入，以測試 JWT 授權和 RLS 功能。
                  </p>
                  <Button
                    className="w-full bg-green-500 hover:bg-green-600"
                    onClick={login}
                  >
                    使用 LINE 登入
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* 操作日誌區 - 放在最下方且寬度占滿 */}
      <Card className="p-6 w-full">
        <h2 className="text-xl font-semibold mb-4">
          操作日誌
          {DEV_MODE && (
            <span className="ml-2 text-xs text-gray-500">
              (按下 D 鍵切換開發者快速登入模式)
            </span>
          )}
        </h2>
        <ScrollArea className="h-[400px] rounded-md border p-4">
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div key={index} className="text-sm font-mono border-b pb-1">
                {log}
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-muted-foreground text-sm">尚無日誌...</p>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* 開發者模式指示器 - 使用 state 來控制是否顯示 */}
      {showDevModeIndicator && (
        <div className="fixed bottom-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full opacity-80">
          開發者模式
        </div>
      )}
    </div>
  );
}
