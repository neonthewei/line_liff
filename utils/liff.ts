import liff from "@line/liff";

// LIFF 初始化狀態
let isInitialized = false;

// 初始化 LIFF
export async function initializeLiff() {
  if (isInitialized) {
    return true;
  }

  // Get LIFF ID from environment variable
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";

  // Skip LIFF initialization if no LIFF ID is provided or in development mode
  if (!liffId || process.env.NODE_ENV === "development") {
    console.log(
      "Skipping LIFF initialization: No LIFF ID provided or in development mode"
    );
    
    // 在開發模式下，嘗試從 URL 獲取參數
    if (typeof window !== "undefined") {
      console.log("Development mode: URL =", window.location.href);
      console.log("Development mode: Search params =", window.location.search);
    }
    
    return true; // Return true to prevent errors in the app flow
  }

  try {
    await liff.init({ liffId });
    isInitialized = true;
    console.log("LIFF initialized successfully");
    
    // 檢查 LIFF URL 參數
    if (liff.isInClient()) {
      try {
        const token = liff.getDecodedIDToken();
        console.log("LIFF token:", token);
        // 安全地訪問 URL
        const url = window.location.href;
        console.log("LIFF URL:", url);
      } catch (error) {
        console.error("Failed to get LIFF token", error);
      }
    }
    
    return true;
  } catch (error) {
    console.error("LIFF initialization failed", error);
    return false;
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
    return result;
  }
  
  // 在 LIFF 環境中，嘗試從 LIFF 獲取參數
  if (isInitialized && liff.isInClient()) {
    try {
      // 嘗試從 LIFF URL 獲取參數
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const result: Record<string, string> = {};
      params.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    } catch (error) {
      console.error("Failed to get LIFF URL parameters", error);
    }
  }
  
  return {};
}
