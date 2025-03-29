import { NextRequest, NextResponse } from "next/server";
// 動態導入 Supabase 客戶端，避免在服務器端構建時出錯
import type { SupabaseClient } from "@supabase/supabase-js";

// 備用的 URL 和 KEY（當環境變數不可用時）
// 注意：這些備用值僅用於緊急情況，確保您的應用繼續運行
// 在實際生產環境中，應使用適當的環境變數
const FALLBACK_SUPABASE_URL = "https://rywxzfjuggbxbzwhrjvc.supabase.co";
const FALLBACK_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5d3h6Zmp1Z2dieGJ6d2hyanZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM0MTg5OTIsImV4cCI6MjAyODk5NDk5Mn0.VYpghZCFAlzE57ZKcf1PvZz9NS6cM8BxiIPPQGAw0-I";

// 安全地獲取 Supabase URL
function getSupabaseUrl(): string {
  // 嘗試讀取環境變數
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (envUrl && envUrl.includes("supabase.co")) {
    console.log("[API] 使用環境變數中的 Supabase URL");
    return envUrl;
  }

  // 如果環境變數不可用或無效，使用備用值
  console.log("[API] 環境變數中的 Supabase URL 不可用，使用備用值");
  return FALLBACK_SUPABASE_URL;
}

// 安全地獲取 Supabase Key
function getSupabaseKey(): string {
  // 優先使用 service role key
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (serviceKey && serviceKey.length > 20) {
    console.log("[API] 使用 SUPABASE_SERVICE_ROLE_KEY");
    return serviceKey;
  }

  // 嘗試使用公共 key
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || "";
  if (publicKey && publicKey.length > 20) {
    console.log("[API] 使用 NEXT_PUBLIC_SUPABASE_KEY");
    return publicKey;
  }

  // 如果兩個都不可用，使用備用值
  console.log("[API] Supabase KEY 不可用，使用備用值");
  return FALLBACK_SUPABASE_KEY;
}

// 處理 POST 請求
export async function POST(request: NextRequest) {
  try {
    console.log("[API] 開始處理定期交易生成請求");

    // 解析請求體以獲取用戶ID
    const reqBody = await request.json().catch((err) => {
      console.error("[API] 解析請求體失敗:", err);
      return {};
    });

    const { userId } = reqBody;

    // 檢查是否提供了用戶ID
    if (!userId) {
      console.warn("[API] 缺少 userId 參數");
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    console.log(`[API] 開始為用戶 ${userId} 生成固定收支交易`);

    // 動態導入 Supabase 客戶端
    try {
      const { createClient } = await import("@supabase/supabase-js");

      // 獲取環境變量（使用我們的安全獲取函數）
      const supabaseUrl = getSupabaseUrl();
      const supabaseServiceKey = getSupabaseKey();

      console.log(
        `[API] Supabase URL 可用: ${
          supabaseUrl ? "是" : "否"
        } (${supabaseUrl.substring(0, 15)}...)`
      );
      console.log(
        `[API] Supabase KEY 可用: ${supabaseServiceKey ? "是" : "否"} (長度: ${
          supabaseServiceKey.length
        })`
      );

      console.log("[API] Supabase 客戶端初始化中...");

      // 使用 service role key 創建 Supabase 客戶端
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      console.log("[API] 調用 RPC 函數生成固定收支交易...");

      // 調用 RPC 函數生成固定收支交易
      const { data, error } = await supabase.rpc(
        "generate_daily_recurring_transactions",
        {
          user_id_param: userId,
        }
      );

      if (error) {
        console.error("[API] 調用 RPC 函數失敗:", error);

        // 嘗試不帶參數調用
        console.log("[API] 嘗試不帶參數調用函數...");
        const { data: data2, error: error2 } = await supabase.rpc(
          "generate_daily_recurring_transactions"
        );

        if (error2) {
          console.error("[API] 不帶參數調用也失敗:", error2);
          return NextResponse.json(
            {
              error: "生成固定收支交易失敗",
              details: error.message,
              fallbackError: error2.message,
            },
            { status: 500 }
          );
        }

        console.log("[API] 成功執行不帶參數的函數調用");
        return NextResponse.json({
          success: true,
          message: "通過全局更新成功生成固定收支交易",
          data: data2,
        });
      }

      console.log("[API] 成功為用戶生成固定收支交易:", userId);
      return NextResponse.json({
        success: true,
        message: "成功生成固定收支交易",
        data,
      });
    } catch (supabaseError) {
      console.error("[API] Supabase 初始化或調用失敗:", supabaseError);
      return NextResponse.json(
        {
          error: "Supabase 操作失敗",
          details:
            supabaseError instanceof Error ? supabaseError.message : "未知錯誤",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[API] 處理請求時發生錯誤:", err);
    return NextResponse.json(
      {
        error: "內部伺服器錯誤",
        details: err instanceof Error ? err.message : "未知錯誤",
      },
      { status: 500 }
    );
  }
}

// 處理 GET 請求（可選，用於測試）
export async function GET(request: NextRequest) {
  try {
    console.log("[API] 開始處理定期交易生成 GET 請求");

    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      console.warn("[API] GET 請求缺少 userId 參數");
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // 使用與 POST 相同的邏輯處理
    try {
      console.log(`[API] 開始為用戶 ${userId} 生成固定收支交易 (GET 請求)`);

      // 動態導入 Supabase 客戶端
      const { createClient } = await import("@supabase/supabase-js");

      // 獲取環境變量（使用安全獲取函數）
      const supabaseUrl = getSupabaseUrl();
      const supabaseServiceKey = getSupabaseKey();

      console.log(
        `[API] GET 請求 - Supabase URL 可用: ${supabaseUrl ? "是" : "否"}`
      );
      console.log(
        `[API] GET 請求 - Supabase KEY 可用: ${
          supabaseServiceKey ? "是" : "否"
        }`
      );

      console.log("[API] GET 請求 - Supabase 客戶端初始化中...");

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      console.log("[API] GET 請求 - 調用 RPC 函數...");

      const { data, error } = await supabase.rpc(
        "generate_daily_recurring_transactions",
        {
          user_id_param: userId,
        }
      );

      if (error) {
        console.error("[API] 調用 RPC 函數失敗 (GET):", error);
        return NextResponse.json(
          { error: "生成固定收支交易失敗", details: error.message },
          { status: 500 }
        );
      }

      console.log("[API] 成功為用戶生成固定收支交易 (GET):", userId);
      return NextResponse.json({
        success: true,
        message: "成功生成固定收支交易",
        data,
      });
    } catch (supabaseError) {
      console.error("[API] GET 請求處理 Supabase 操作失敗:", supabaseError);
      return NextResponse.json(
        {
          error: "Supabase 操作失敗",
          details:
            supabaseError instanceof Error ? supabaseError.message : "未知錯誤",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[API] 處理 GET 請求時發生錯誤:", err);
    return NextResponse.json(
      {
        error: "內部伺服器錯誤",
        details: err instanceof Error ? err.message : "未知錯誤",
      },
      { status: 500 }
    );
  }
}
