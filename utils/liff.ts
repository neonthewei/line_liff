import liff from "@line/liff"

// LIFF 初始化狀態
let isInitialized = false

// 初始化 LIFF
export async function initializeLiff() {
  if (isInitialized) {
    return true
  }

  try {
    await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || "" })
    isInitialized = true
    console.log("LIFF initialized successfully")
    return true
  } catch (error) {
    console.error("LIFF initialization failed", error)
    return false
  }
}

// 關閉 LIFF 視窗
export function closeLiff() {
  if (isInitialized && liff.isInClient()) {
    liff.closeWindow()
  }
}

