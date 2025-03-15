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
  
  // 記錄導航信息
  console.log("Navigating in LIFF");
  console.log("Target path:", path);
  console.log("Parameters:", params);
  
  // 構建完整 URL
  const baseUrl = window.location.origin;
  let url = new URL(path, baseUrl);
  
  // 檢查是否需要切換 LIFF ID
  const currentPath = window.location.pathname;
  const targetPath = url.pathname;
  
  const isTransactionToList = 
    (currentPath.includes('/transaction') && !currentPath.includes('/transactions')) && 
    targetPath.includes('/transactions');
  
  const isListToTransaction = 
    currentPath.includes('/transactions') && 
    (targetPath.includes('/transaction') && !targetPath.includes('/transactions'));
  
  // 如果是從列表到詳情頁，考慮使用路徑參數而不是查詢參數
  // 例如: /transaction/123 而不是 /transaction?id=123
  if (isListToTransaction && params.id) {
    // 嘗試使用路徑參數格式
    const transactionId = params.id;
    // 從參數中移除 id，因為它將成為路徑的一部分
    const otherParams = { ...params };
    delete otherParams.id;
    
    // 構建新的 URL，將 ID 作為路徑的一部分
    url = new URL(`${path}/${transactionId}`, baseUrl);
    
    // 將其他參數添加到 URL
    Object.entries(otherParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    console.log("Using path parameter format for transaction ID");
    console.log("New URL:", url.toString());
  } else {
    // 使用標準查詢參數
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  // 保存參數到 localStorage 以便在頁面之間保持狀態
  try {
    if (params.id) {
      localStorage.setItem('lastTransactionId', params.id);
      console.log("Saved transaction ID to localStorage:", params.id);
    }
    
    if (params.type) {
      localStorage.setItem('lastTransactionType', params.type);
      console.log("Saved transaction type to localStorage:", params.type);
    }
  } catch (storageError) {
    console.error("Failed to save parameters to localStorage:", storageError);
  }
  
  // 如果需要切換 LIFF ID，則使用外部瀏覽器打開
  if (isTransactionToList || isListToTransaction) {
    console.log("Switching LIFF ID, using external navigation");
    console.log("Current path:", currentPath);
    console.log("Target path:", targetPath);
    
    // 確保參數被正確添加到 URL 中
    // 對於 LIFF 外部導航，我們需要確保參數被正確傳遞
    
    // 創建一個包含所有參數的 liff.state 字符串
    if (Object.keys(params).length > 0) {
      // 將參數添加到 liff.state 中，以確保它們在跨 LIFF 上下文時被保留
      const stateParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        stateParams.append(key, value);
      });
      
      // 將 liff.state 添加到 URL 中
      url.searchParams.append("liff.state", stateParams.toString());
      console.log("Added liff.state to URL:", stateParams.toString());
    }
    
    // 在 URL 中添加時間戳以避免緩存問題
    url.searchParams.append("_t", Date.now().toString());
    
    console.log("Final URL for external navigation:", url.toString());
    
    // 在 LIFF 客戶端中使用 openWindow 並設置 external 為 true
    if (isInitialized && !BYPASS_LIFF && liff.isInClient()) {
      // 檢查 LIFF 是否已登入，如果未登入或 token 已過期，則重新登入
      try {
        // 嘗試獲取 access token 來檢查是否有效
        const token = liff.getAccessToken();
        if (!token) {
          console.log("No access token found, attempting to login");
          liff.login({
            redirectUri: url.toString()
          });
          return;
        }
        
        // 正常導航
        liff.openWindow({
          url: url.toString(),
          external: true
        });
      } catch (error) {
        console.error("Error during navigation, token may be expired:", error);
        // 如果出錯（可能是 token 過期），嘗試重新登入
        console.log("Attempting to re-login");
        try {
          liff.login({
            redirectUri: url.toString()
          });
        } catch (loginError) {
          console.error("Failed to re-login:", loginError);
          // 如果重新登入失敗，嘗試直接導航
          window.location.href = url.toString();
        }
      }
    } else {
      window.location.href = url.toString();
    }
    return;
  }
  
  // 如果不需要切換 LIFF ID，則使用普通導航
  console.log("Using standard navigation (same LIFF context)");
  console.log("Final URL:", url.toString());
  
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
  
  // 創建結果對象
  const result: Record<string, string> = {};
  
  // 記錄當前 URL 和搜索參數，無論在什麼模式下
  console.log("Getting LIFF URL parameters");
  console.log("Current URL:", window.location.href);
  console.log("Search params:", window.location.search);
  
  // 方法 1: 直接從 URL 獲取參數 (最直接的方法)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.forEach((value, key) => {
      result[key] = value;
      console.log(`Direct URL parameter: ${key}=${value}`);
    });
  } catch (error) {
    console.error("Failed to parse URL parameters:", error);
  }
  
  // 方法 2: 嘗試從 URL hash 獲取參數 (某些 LIFF 版本可能使用 hash)
  try {
    if (window.location.hash && window.location.hash.length > 1) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      hashParams.forEach((value, key) => {
        if (!result[key]) { // 不覆蓋已有的參數
          result[key] = value;
          console.log(`Hash parameter: ${key}=${value}`);
        }
      });
    }
  } catch (error) {
    console.error("Failed to parse hash parameters:", error);
  }
  
  // 方法 3: 嘗試從 liff.state 獲取參數
  try {
    const liffState = new URLSearchParams(window.location.search).get("liff.state");
    if (liffState) {
      console.log("Found liff.state in URL:", liffState);
      try {
        const stateParams = new URLSearchParams(liffState);
        stateParams.forEach((value, key) => {
          result[key] = value;
          console.log(`liff.state parameter: ${key}=${value}`);
        });
      } catch (stateError) {
        console.error("Failed to parse liff.state:", stateError);
      }
    }
  } catch (error) {
    console.error("Failed to extract liff.state:", error);
  }
  
  // 方法 4: 嘗試從 LIFF context 獲取參數 (如果 LIFF 已初始化)
  if (isInitialized && !BYPASS_LIFF && typeof liff !== 'undefined') {
    try {
      const context = liff.getContext();
      console.log("LIFF context for parameters:", context);
      
      // 嘗試從 context.query 獲取參數 (某些 LIFF 版本支持)
      if (context && typeof context === 'object') {
        // 使用類型斷言處理可能的 query 屬性
        const anyContext = context as any;
        if (anyContext.query && typeof anyContext.query === 'object') {
          Object.entries(anyContext.query).forEach(([key, value]) => {
            if (typeof value === 'string' && !result[key]) {
              result[key] = value;
              console.log(`LIFF context query parameter: ${key}=${value}`);
            }
          });
        }
      }
    } catch (contextError) {
      console.error("Failed to get parameters from LIFF context:", contextError);
    }
  }
  
  // 方法 5: 嘗試從 URL 路徑中提取參數 (如果 URL 格式為 /transaction/123)
  try {
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length > 2 && pathParts[1] === 'transaction' && pathParts[2]) {
      const potentialId = pathParts[2];
      if (potentialId && !result.id) {
        result.id = potentialId;
        console.log(`Extracted ID from URL path: ${potentialId}`);
      }
    }
  } catch (pathError) {
    console.error("Failed to extract ID from path:", pathError);
  }
  
  // 處理 recordId 參數，轉換為 id (注意大寫 I)
  if (result.recordId && !result.id) {
    result.id = result.recordId;
    console.log("Converting recordId to id:", result.id);
  }
  
  // 在開發模式下，如果沒有提供 id 和 type 參數，則使用預設值
  if (DEV_MODE || BYPASS_LIFF) {
    if (!result.id) {
      result.id = "14";
      console.log("Using default id in dev/bypass mode:", result.id);
    }
    
    if (!result.type) {
      result.type = "expense";
      console.log("Using default type in dev/bypass mode:", result.type);
    }
    
    // 在繞過 LIFF 模式下添加用戶 ID
    if (BYPASS_LIFF && !result.userId) {
      result.userId = "U08946a96a3892561e1c3baa589ffeaee";
      console.log("Using default userId in bypass mode:", result.userId);
    }
  }
  
  // 最後的緊急回退：從 localStorage 獲取最近使用的參數
  // 這可以在頁面刷新或導航時保持參數
  try {
    if (!result.id && localStorage.getItem('lastTransactionId')) {
      result.id = localStorage.getItem('lastTransactionId') || '';
      console.log("Recovered ID from localStorage:", result.id);
    }
    
    if (!result.type && localStorage.getItem('lastTransactionType')) {
      result.type = localStorage.getItem('lastTransactionType') || '';
      console.log("Recovered type from localStorage:", result.type);
    }
  } catch (storageError) {
    console.error("Failed to access localStorage:", storageError);
  }
  
  // 如果找到了 ID 和 type，將它們保存到 localStorage 以備將來使用
  try {
    if (result.id) {
      localStorage.setItem('lastTransactionId', result.id);
    }
    
    if (result.type) {
      localStorage.setItem('lastTransactionType', result.type);
    }
  } catch (storageError) {
    console.error("Failed to save to localStorage:", storageError);
  }
  
  // 記錄最終獲取到的參數
  console.log("Final parameters:", result);
  
  return result;
}
