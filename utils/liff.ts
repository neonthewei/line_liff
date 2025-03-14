import liff from "@line/liff";

// LIFF 初始化狀態
let isInitialized = false;

// 開發模式標誌 - 設置為 true 可以在本地開發時繞過 LIFF 初始化
const DEV_MODE = process.env.NODE_ENV === "development";
const BYPASS_LIFF = DEV_MODE && (process.env.NEXT_PUBLIC_BYPASS_LIFF === "true");

// 初始化 LIFF
export async function initializeLiff() {
  // 避免重複初始化
  if (isInitialized) {
    console.log("LIFF already initialized");
    return true;
  }

  // 在開發模式下，如果設置了繞過 LIFF，則直接返回
  if (BYPASS_LIFF) {
    console.log("LIFF initialization bypassed in development mode");
    
    // 在開發模式下模擬 LIFF 對象
    if (typeof window !== "undefined" && !window.liff) {
      window.liff = {
        isInClient: () => false,
        isLoggedIn: () => true,
        getProfile: async () => ({ 
          userId: "U08946a96a3892561e1c3baa589ffeaee", 
          displayName: "Dev User",
          pictureUrl: "https://profile.line-scdn.net/placeholder-image.png",
          statusMessage: "開發模式測試用戶"
        }),
        login: () => console.log("LIFF login called in dev mode"),
        getAccessToken: () => "dev-token",
        getContext: async () => ({ type: "external" }),
        closeWindow: () => console.log("LIFF closeWindow called in dev mode")
      };
    }
    
    isInitialized = true;
    return true;
  }

  try {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      throw new Error("LIFF ID is required");
    }

    // 在開發模式下，記錄更多信息
    if (DEV_MODE) {
      console.log("Initializing LIFF in development mode");
      console.log("LIFF ID:", liffId);
    }

    // 初始化 LIFF，參考官方範例
    await liff.init({
      liffId: liffId,
      withLoginOnExternalBrowser: true
    });

    isInitialized = true;
    console.log("LIFF initialization completed");

    // 記錄當前環境信息
    console.log("LIFF isInClient:", liff.isInClient());
    console.log("LIFF isLoggedIn:", liff.isLoggedIn());
    
    try {
      const context = await liff.getContext();
      console.log("LIFF Context:", context);
    } catch (error) {
      console.error("Failed to get LIFF context:", error);
    }
    
    return true;
  } catch (error) {
    console.error("LIFF initialization failed:", error);
    isInitialized = false;
    return false;
  }
}

// 關閉 LIFF 視窗
export function closeLiff() {
  // Skip if not initialized or not in LIFF browser
  if (!isInitialized || BYPASS_LIFF) {
    return;
  }

  // Only close if in LIFF client
  if (liff.isInClient()) {
    liff.closeWindow();
  }
}

// 獲取 LIFF URL 參數
export function getLiffUrlParams() {
  if (typeof window === "undefined") {
    return {};
  }
  
  // 在開發模式下，直接從 window.location 獲取參數
  if (DEV_MODE) {
    const params = new URLSearchParams(window.location.search);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    
    // 處理 recordId 參數，轉換為 id（注意大寫 I）
    if (result.recordId && !result.id) {
      result.id = result.recordId;
      console.log("Converting recordId to id:", result.id);
    }
    
    // 在開發模式下，如果沒有提供 id 和 type 參數，則使用預設值
    if (!result.id && !params.has("id") && !params.has("recordId")) {
      result.id = "14";
      console.log("Using default id:", result.id);
    }
    
    if (!result.type && !params.has("type")) {
      result.type = "expense";
      console.log("Using default type:", result.type);
    }
    
    return result;
  }
  
  // 在 LIFF 環境中
  if (isInitialized && !BYPASS_LIFF && liff.isInClient()) {
    try {
      // 首先嘗試從 URL 獲取參數
      const params = new URLSearchParams(window.location.search);
      const result: Record<string, string> = {};
      
      // 獲取所有 URL 參數
      params.forEach((value, key) => {
        result[key] = value;
      });
      
      // 處理 recordId 參數，轉換為 id（注意大寫 I）
      if (result.recordId && !result.id) {
        result.id = result.recordId;
        console.log("Converting recordId to id:", result.id);
      }
      
      // 如果沒有找到必要的參數，嘗試從 liff.state 獲取
      if (!result.id || !result.type) {
        const liffState = params.get("liff.state");
        if (liffState) {
          try {
            const stateParams = new URLSearchParams(liffState);
            stateParams.forEach((value, key) => {
              result[key] = value;
            });
            
            // 處理 liff.state 中的 recordId 參數（注意大寫 I）
            if (result.recordId && !result.id) {
              result.id = result.recordId;
              console.log("Converting recordId to id from liff.state:", result.id);
            }
          } catch (error) {
            console.error("Failed to parse liff.state", error);
          }
        }
      }
      
      // 記錄最終獲取到的參數
      console.log("Final LIFF parameters:", result);
      return result;
    } catch (error) {
      console.error("Failed to get LIFF URL parameters", error);
      return {};
    }
  }
  
  // 如果是開發模式且繞過 LIFF，返回預設參數
  if (BYPASS_LIFF) {
    const params = new URLSearchParams(window.location.search);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    
    // 處理 recordId 參數，轉換為 id（注意大寫 I）
    if (result.recordId && !result.id) {
      result.id = result.recordId;
      console.log("Converting recordId to id in bypass mode:", result.id);
    }
    
    // 如果沒有提供 id 和 type 參數，則使用預設值
    if (!result.id && !params.has("id") && !params.has("recordId")) {
      result.id = "14";
      console.log("Using default id in bypass mode:", result.id);
    }
    
    if (!result.type && !params.has("type")) {
      result.type = "expense";
      console.log("Using default type in bypass mode:", result.type);
    }
    
    // 添加用戶ID
    result.userId = "U08946a96a3892561e1c3baa589ffeaee";
    console.log("Using default userId in bypass mode:", result.userId);
    
    return result;
  }
  
  return {};
}
