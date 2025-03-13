import liff from "@line/liff";

// LIFF 初始化狀態
let isInitialized = false;

// 初始化 LIFF
export async function initializeLiff() {
  // 避免重複初始化
  if (isInitialized) {
    console.log("LIFF already initialized");
    return;
  }

  try {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      throw new Error("LIFF ID is required");
    }

    // 在開發模式下，記錄更多信息
    if (process.env.NODE_ENV === "development") {
      console.log("Initializing LIFF in development mode");
      console.log("LIFF ID:", liffId);
    }

    // 初始化 LIFF
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

  } catch (error) {
    console.error("LIFF initialization failed:", error);
    throw error;
  }
}

// 關閉 LIFF 視窗
export function closeLiff() {
  // Skip if not initialized or not in LIFF browser
  if (!isInitialized) {
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
  if (process.env.NODE_ENV === "development") {
    const params = new URLSearchParams(window.location.search);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    
    // 在開發模式下，如果沒有提供 recordId 和 type 參數，則使用預設值
    if (!result.recordId && !params.has("recordId")) {
      result.recordId = "14";
      console.log("Using default recordId:", result.recordId);
    }
    
    if (!result.type && !params.has("type")) {
      result.type = "expense";
      console.log("Using default type:", result.type);
    }
    
    return result;
  }
  
  // 在 LIFF 環境中
  if (isInitialized && liff.isInClient()) {
    try {
      // 首先嘗試從 URL 獲取參數
      const params = new URLSearchParams(window.location.search);
      const result: Record<string, string> = {};
      
      // 獲取所有 URL 參數
      params.forEach((value, key) => {
        result[key] = value;
      });
      
      // 如果沒有找到必要的參數，嘗試從 liff.state 獲取
      if (!result.recordId || !result.type) {
        const liffState = params.get("liff.state");
        if (liffState) {
          try {
            const stateParams = new URLSearchParams(liffState);
            stateParams.forEach((value, key) => {
              result[key] = value;
            });
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
  
  return {};
}
