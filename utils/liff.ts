import liff from "@line/liff";

// LIFF 初始化狀態
let isInitialized = false;

// 開發模式標誌 - 設置為 true 可以在本地開發時繞過 LIFF 初始化
const DEV_MODE = process.env.NODE_ENV === "development";
const BYPASS_LIFF = DEV_MODE && (process.env.NEXT_PUBLIC_BYPASS_LIFF === "true");

// LIFF IDs for different pages
const LIFF_ID_TRANSACTIONS = process.env.NEXT_PUBLIC_LIFF_ID_TRANSACTIONS;
const LIFF_ID_TRANSACTION = process.env.NEXT_PUBLIC_LIFF_ID_TRANSACTION;

// 獲取當前頁面的 LIFF ID
export function getLiffId(): string {
  if (typeof window === 'undefined') {
    return LIFF_ID_TRANSACTIONS || '';
  }

  // 根據當前 URL 路徑決定使用哪個 LIFF ID
  const path = window.location.pathname;
  
  if (path.includes('/transaction') && !path.includes('/transactions')) {
    return LIFF_ID_TRANSACTION || '';
  }
  
  // 默認使用交易列表頁的 LIFF ID
  return LIFF_ID_TRANSACTIONS || '';
}

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
        closeWindow: () => console.log("LIFF closeWindow called in dev mode"),
        openWindow: (params: { url: string, external: boolean }) => console.log("LIFF openWindow called in dev mode with params:", params),
      };
    }
    
    isInitialized = true;
    return true;
  }

  try {
    const liffId = getLiffId();
    if (!liffId) {
      throw new Error("LIFF ID is required");
    }

    // 在開發模式下，記錄更多信息
    if (DEV_MODE) {
      console.log("Initializing LIFF in development mode");
      console.log("LIFF ID:", liffId);
      console.log("Current path:", typeof window !== 'undefined' ? window.location.pathname : 'unknown');
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

// 在 LIFF 中導航到另一個頁面
export function navigateInLiff(path: string, params: Record<string, string> = {}) {
  if (typeof window === 'undefined') {
    return;
  }
  
  // 構建完整 URL
  const baseUrl = window.location.origin;
  const url = new URL(path, baseUrl);
  
  // 添加參數
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  // 在開發模式下記錄
  if (DEV_MODE) {
    console.log("Navigating in LIFF to:", url.toString());
    console.log("Navigation params:", params);
  }
  
  // 檢查是否需要切換 LIFF ID
  const currentPath = window.location.pathname;
  const targetPath = url.pathname;
  
  const isTransactionToList = 
    (currentPath.includes('/transaction') && !currentPath.includes('/transactions')) && 
    targetPath.includes('/transactions');
  
  const isListToTransaction = 
    currentPath.includes('/transactions') && 
    (targetPath.includes('/transaction') && !targetPath.includes('/transactions'));
  
  // 如果需要切換 LIFF ID，則使用外部瀏覽器打開
  if (isTransactionToList || isListToTransaction) {
    if (DEV_MODE) {
      console.log("Switching LIFF ID, using external navigation");
      console.log("Current path:", currentPath);
      console.log("Target path:", targetPath);
      console.log("Full URL with params:", url.toString());
    }
    
    // 確保參數被正確添加到 URL 中
    // 對於 LIFF 外部導航，我們需要確保參數被正確傳遞
    // 在某些情況下，我們可能需要使用 liff.state 來傳遞參數
    
    // 創建一個包含所有參數的 liff.state 字符串
    if (Object.keys(params).length > 0) {
      // 將參數添加到 liff.state 中，以確保它們在跨 LIFF 上下文時被保留
      const stateParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        stateParams.append(key, value);
      });
      
      // 將 liff.state 添加到 URL 中
      url.searchParams.append("liff.state", stateParams.toString());
      
      if (DEV_MODE) {
        console.log("Added liff.state to URL:", stateParams.toString());
        console.log("Final URL with liff.state:", url.toString());
      }
    }
    
    // 在 LIFF 客戶端中使用 openWindow 並設置 external 為 true
    if (isInitialized && !BYPASS_LIFF && liff.isInClient()) {
      liff.openWindow({
        url: url.toString(),
        external: true
      });
    } else {
      window.location.href = url.toString();
    }
    return;
  }
  
  // 如果不需要切換 LIFF ID，則使用普通導航
  if (isInitialized && !BYPASS_LIFF && liff.isInClient()) {
    liff.openWindow({
      url: url.toString(),
      external: false
    });
  } else {
    window.location.href = url.toString();
  }
}

// 獲取 LIFF URL 參數
export function getLiffUrlParams() {
  if (typeof window === "undefined") {
    return {};
  }
  
  // 在開發模式下記錄
  if (DEV_MODE) {
    console.log("Getting LIFF URL parameters");
    console.log("Current URL:", window.location.href);
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
    
    // 檢查 liff.state 參數
    const liffState = params.get("liff.state");
    if (liffState) {
      try {
        console.log("Found liff.state in URL:", liffState);
        const stateParams = new URLSearchParams(liffState);
        stateParams.forEach((value, key) => {
          result[key] = value;
          console.log(`Extracted from liff.state: ${key}=${value}`);
        });
      } catch (error) {
        console.error("Failed to parse liff.state", error);
      }
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
    
    console.log("Final parameters in dev mode:", result);
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
        console.log(`URL parameter: ${key}=${value}`);
      });
      
      // 處理 recordId 參數，轉換為 id（注意大寫 I）
      if (result.recordId && !result.id) {
        result.id = result.recordId;
        console.log("Converting recordId to id:", result.id);
      }
      
      // 檢查 liff.state 參數
      const liffState = params.get("liff.state");
      if (liffState) {
        try {
          console.log("Found liff.state in URL:", liffState);
          const stateParams = new URLSearchParams(liffState);
          stateParams.forEach((value, key) => {
            result[key] = value;
            console.log(`Extracted from liff.state: ${key}=${value}`);
          });
        } catch (error) {
          console.error("Failed to parse liff.state", error);
        }
      }
      
      // 如果仍然沒有找到 id 或 type，嘗試從 LIFF context 獲取
      if (!result.id || !result.type) {
        try {
          const context = liff.getContext();
          console.log("LIFF context for parameters:", context);
          
          // 某些 LIFF 版本可能在 context 中包含 query 參數
          // 使用類型斷言來處理可能的 query 屬性
          interface ExtendedContext {
            query?: Record<string, string>;
          }
          
          const contextWithQuery = context as unknown as ExtendedContext;
          if (contextWithQuery && contextWithQuery.query) {
            Object.entries(contextWithQuery.query).forEach(([key, value]) => {
              if (typeof value === 'string') {
                result[key] = value;
                console.log(`Parameter from LIFF context: ${key}=${value}`);
              }
            });
          }
        } catch (contextError) {
          console.error("Failed to get parameters from LIFF context:", contextError);
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
    
    // 檢查 liff.state 參數
    const liffState = params.get("liff.state");
    if (liffState) {
      try {
        console.log("Found liff.state in URL (bypass mode):", liffState);
        const stateParams = new URLSearchParams(liffState);
        stateParams.forEach((value, key) => {
          result[key] = value;
          console.log(`Extracted from liff.state (bypass mode): ${key}=${value}`);
        });
      } catch (error) {
        console.error("Failed to parse liff.state in bypass mode", error);
      }
    }
    
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
    
    console.log("Final parameters in bypass mode:", result);
    return result;
  }
  
  return {};
}
