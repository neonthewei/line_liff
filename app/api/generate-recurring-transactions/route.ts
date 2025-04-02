import { NextRequest, NextResponse } from "next/server";
// 動態導入 Supabase 客戶端，避免在服務器端構建時出錯
import type { SupabaseClient } from "@supabase/supabase-js";

// 處理 POST 請求
export async function POST(request: NextRequest) {
  try {
    // 解析請求體以獲取用戶ID
    const { userId } = await request.json();

    // 檢查是否提供了用戶ID
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    console.log(`開始為用戶 ${userId} 生成固定收支交易`);

    // 動態導入 Supabase 客戶端
    const { createClient } = await import("@supabase/supabase-js");

    // 獲取環境變量
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_KEY!;

    // 使用 service role key 創建 Supabase 客戶端
    // 這比常規 API key 有更高權限
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 調用 RPC 函數生成固定收支交易
    // SQL: SELECT generate_daily_recurring_transactions('U08946a96a3892561e1c3baa589ffeaee');
    const { data, error } = await supabase.rpc(
      "generate_daily_recurring_transactions",
      { target_user_id: userId }
    );

    if (error) {
      console.error("調用 RPC 函數失敗:", error);

      // 嘗試不帶參數調用
      console.log("嘗試不帶參數調用函數...");
      const { data: data2, error: error2 } = await supabase.rpc(
        "generate_daily_recurring_transactions"
      );

      if (error2) {
        console.error("不帶參數調用也失敗:", error2);
        return NextResponse.json(
          {
            error: "生成固定收支交易失敗",
            details: error.message,
            fallbackError: error2.message,
          },
          { status: 500 }
        );
      }

      console.log("成功執行不帶參數的函數調用");
      return NextResponse.json({
        success: true,
        message: "通過全局更新成功生成固定收支交易",
        data: data2,
      });
    }

    console.log("成功為用戶生成固定收支交易:", userId);
    return NextResponse.json({
      success: true,
      message: "成功生成固定收支交易",
      data,
    });
  } catch (err) {
    console.error("處理請求時發生錯誤:", err);
    return NextResponse.json({ error: "內部伺服器錯誤" }, { status: 500 });
  }
}

// 處理 GET 請求（可選，用於測試）
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId parameter" },
      { status: 400 }
    );
  }

  // 使用與 POST 相同的邏輯處理
  try {
    console.log(`開始為用戶 ${userId} 生成固定收支交易 (GET 請求)`);

    // 動態導入 Supabase 客戶端
    const { createClient } = await import("@supabase/supabase-js");

    // 獲取環境變量
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SQL: SELECT generate_daily_recurring_transactions('U08946a96a3892561e1c3baa589ffeaee');
    const { data, error } = await supabase.rpc(
      "generate_daily_recurring_transactions",
      { target_user_id: userId }
    );

    if (error) {
      console.error("調用 RPC 函數失敗 (GET):", error);
      return NextResponse.json(
        { error: "生成固定收支交易失敗", details: error.message },
        { status: 500 }
      );
    }

    console.log("成功為用戶生成固定收支交易 (GET):", userId);
    return NextResponse.json({
      success: true,
      message: "成功生成固定收支交易",
      data,
    });
  } catch (err) {
    console.error("處理 GET 請求時發生錯誤:", err);
    return NextResponse.json({ error: "內部伺服器錯誤" }, { status: 500 });
  }
}
