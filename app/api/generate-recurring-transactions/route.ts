import { NextRequest, NextResponse } from "next/server";
// 動態導入 Supabase 客戶端，避免在服務器端構建時出錯
import type { SupabaseClient } from "@supabase/supabase-js";

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

      // 獲取環境變量
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_KEY;

      if (!supabaseUrl) {
        throw new Error("NEXT_PUBLIC_SUPABASE_URL 未定義");
      }

      if (!supabaseServiceKey) {
        throw new Error(
          "SUPABASE_SERVICE_ROLE_KEY 或 NEXT_PUBLIC_SUPABASE_KEY 未定義"
        );
      }

      console.log(`[API] Supabase URL: ${supabaseUrl.substring(0, 20)}...`);
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

      // 獲取環境變量
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_KEY;

      if (!supabaseUrl) {
        throw new Error("NEXT_PUBLIC_SUPABASE_URL 未定義");
      }

      if (!supabaseServiceKey) {
        throw new Error(
          "SUPABASE_SERVICE_ROLE_KEY 或 NEXT_PUBLIC_SUPABASE_KEY 未定義"
        );
      }

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
