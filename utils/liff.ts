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
    return true; // Return true to prevent errors in the app flow
  }

  try {
    await liff.init({ liffId });
    isInitialized = true;
    console.log("LIFF initialized successfully");
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
