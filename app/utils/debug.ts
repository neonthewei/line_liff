// 存儲控制台日誌和錯誤
let consoleLogs: string[] = [];
let consoleErrors: string[] = [];

// 最大日誌數量
const MAX_LOGS = 100;

// 初始化控制台捕獲
export function initConsoleCapture() {
  if (typeof window === 'undefined') {
    return;
  }

  // 保存原始控制台方法
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;

  // 重寫 console.log
  console.log = function(...args) {
    // 調用原始方法
    originalConsoleLog.apply(console, args);
    
    // 將參數轉換為字符串並存儲
    const logString = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    consoleLogs.unshift(`[LOG] ${logString}`);
    
    // 限制日誌數量
    if (consoleLogs.length > MAX_LOGS) {
      consoleLogs = consoleLogs.slice(0, MAX_LOGS);
    }
  };

  // 重寫 console.error
  console.error = function(...args) {
    // 調用原始方法
    originalConsoleError.apply(console, args);
    
    // 將參數轉換為字符串並存儲
    const errorString = args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
      }
      return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
    }).join(' ');
    
    consoleErrors.unshift(`[ERROR] ${errorString}`);
    
    // 限制錯誤數量
    if (consoleErrors.length > MAX_LOGS) {
      consoleErrors = consoleErrors.slice(0, MAX_LOGS);
    }
  };

  // 重寫 console.warn
  console.warn = function(...args) {
    // 調用原始方法
    originalConsoleWarn.apply(console, args);
    
    // 將參數轉換為字符串並存儲
    const warnString = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    consoleLogs.unshift(`[WARN] ${warnString}`);
    
    // 限制日誌數量
    if (consoleLogs.length > MAX_LOGS) {
      consoleLogs = consoleLogs.slice(0, MAX_LOGS);
    }
  };

  // 重寫 console.info
  console.info = function(...args) {
    // 調用原始方法
    originalConsoleInfo.apply(console, args);
    
    // 將參數轉換為字符串並存儲
    const infoString = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    consoleLogs.unshift(`[INFO] ${infoString}`);
    
    // 限制日誌數量
    if (consoleLogs.length > MAX_LOGS) {
      consoleLogs = consoleLogs.slice(0, MAX_LOGS);
    }
  };
}

// 獲取捕獲的日誌
export function getCaptureLogs(): string[] {
  return [...consoleLogs];
}

// 獲取捕獲的錯誤
export function getCaptureErrors(): string[] {
  return [...consoleErrors];
}

// 清除捕獲的日誌和錯誤
export function clearCaptureLogs() {
  consoleLogs = [];
  consoleErrors = [];
}

// 添加自定義日誌
export function addCustomLog(message: string) {
  consoleLogs.unshift(`[CUSTOM] ${message}`);
  
  // 限制日誌數量
  if (consoleLogs.length > MAX_LOGS) {
    consoleLogs = consoleLogs.slice(0, MAX_LOGS);
  }
}

// 添加自定義錯誤
export function addCustomError(message: string) {
  consoleErrors.unshift(`[CUSTOM] ${message}`);
  
  // 限制錯誤數量
  if (consoleErrors.length > MAX_LOGS) {
    consoleErrors = consoleErrors.slice(0, MAX_LOGS);
  }
} 