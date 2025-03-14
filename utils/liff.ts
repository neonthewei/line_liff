import liff from "@line/liff";

// LIFF 初始化狀態
let isInitialized = false;

// 開發模式標誌 - 設置為 true 可以在本地開發時繞過 LIFF 初始化
const DEV_MODE = process.env.NODE_ENV === "development";
const BYPASS_LIFF = DEV_MODE && (process.env.NEXT_PUBLIC_BYPASS_LIFF === "true");

// 初始化 LIFF
export async function initializeLiff() {
  // 在開發模式下，如果設置了繞過 LIFF，則直接返回
  if (BYPASS_LIFF) {
    console.log("LIFF initialization bypassed in development mode");
    isInitialized = true;
    return true;
  }

  // 避免重複初始化
  if (isInitialized) {
    console.log("LIFF already initialized");
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

    // 初始化 LIFF
    // 注意：要使用 liff.sendMessages() 功能，需要在 LINE Developers 控制台中為 LIFF 應用啟用 chat_message.write 權限
    await liff.init({
      liffId: liffId,
      withLoginOnExternalBrowser: true
    });

    isInitialized = true;
    console.log("LIFF initialization completed");

    // 在 LIFF 客戶端中，獲取 token
    if (liff.isInClient()) {
      try {
        const token = liff.getAccessToken();
        if (token) {
          console.log("LIFF token retrieved successfully");
        }
      } catch (error) {
        console.error("Failed to get LIFF token:", error);
      }
    } else {
      console.log("Not in LIFF client");
    }

    // 記錄當前環境信息
    console.log("LIFF isInClient:", liff.isInClient());
    console.log("LIFF isLoggedIn:", liff.isLoggedIn());
    console.log("LIFF Context:", await liff.getContext());
    
    return true;
  } catch (error) {
    console.error("LIFF initialization failed:", error);
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
    
    // 處理 recordid 參數，轉換為 id
    if (result.recordid && !result.id) {
      result.id = result.recordid;
      console.log("Converting recordid to id:", result.id);
    }
    
    // 在開發模式下，如果沒有提供 id 和 type 參數，則使用預設值
    if (!result.id && !params.has("id") && !params.has("recordid")) {
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
      
      // 處理 recordid 參數，轉換為 id
      if (result.recordid && !result.id) {
        result.id = result.recordid;
        console.log("Converting recordid to id:", result.id);
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
            
            // 處理 liff.state 中的 recordid 參數
            if (result.recordid && !result.id) {
              result.id = result.recordid;
              console.log("Converting recordid to id from liff.state:", result.id);
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
    
    // 處理 recordid 參數，轉換為 id
    if (result.recordid && !result.id) {
      result.id = result.recordid;
      console.log("Converting recordid to id in bypass mode:", result.id);
    }
    
    // 如果沒有提供 id 和 type 參數，則使用預設值
    if (!result.id && !params.has("id") && !params.has("recordid")) {
      result.id = "14";
      console.log("Using default id in bypass mode:", result.id);
    }
    
    if (!result.type && !params.has("type")) {
      result.type = "expense";
      console.log("Using default type in bypass mode:", result.type);
    }
    
    return result;
  }
  
  return {};
}
