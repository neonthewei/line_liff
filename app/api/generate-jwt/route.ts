import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose"; // 使用 jose 庫來處理 JWT

// 處理 POST 請求
export async function POST(request: NextRequest) {
  try {
    // 解析請求體
    const { lineUserData } = await request.json();

    if (!lineUserData || !lineUserData.sub) {
      return NextResponse.json(
        { error: "缺少必要的 LINE 用戶資料" },
        { status: 400 }
      );
    }

    // 獲取環境變量中的 JWT Secret (Supabase JWT Secret)
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;

    if (!jwtSecret) {
      return NextResponse.json({ error: "未配置 JWT Secret" }, { status: 500 });
    }

    // 使用 LINE ID 作為唯一標識符，但將其轉換為 UUID 格式 (一致的)
    // 對於實際應用，你應該將 LINE ID 與實際的 Supabase 用戶 ID 關聯
    function lineIdToUUID(lineId: string): string {
      // 創建一個簡單的哈希函數確保相同的 line ID 始終轉換為相同的 UUID
      let hash = 0;
      for (let i = 0; i < lineId.length; i++) {
        const char = lineId.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // 轉換為 32 位整數
      }

      // 使用哈希值創建確定性的 UUID 格式字符串
      const hashStr = Math.abs(hash).toString(16).padStart(8, "0");
      return `${hashStr.slice(0, 8)}-${hashStr.slice(0, 4)}-4${hashStr.slice(
        1,
        4
      )}-${((parseInt(hashStr.slice(0, 4), 16) & 0x3) | 0x8).toString(
        16
      )}${hashStr.slice(1, 3)}-${hashStr.slice(0, 12)}`;
    }

    // 為特定的 LINE ID 創建確定性的 UUID
    const userId = lineIdToUUID(lineUserData.sub);

    // 確保支持 RLS 策略所需的欄位
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 3600; // 1小時後過期

    // 確保所有中文字符都被正確處理
    const safeName = lineUserData.name
      ? encodeURIComponent(lineUserData.name)
      : "LINE User";

    // Supabase JWT 格式
    // 注意：這裡增加了必要的字段，確保與 Supabase 內部格式一致
    const payload = {
      aud: "authenticated",
      exp: expiresAt,
      iat: now,
      iss: "supabase",
      sub: userId,
      email: `${lineUserData.sub}@example.com`,
      phone: "",
      app_metadata: {
        provider: "line",
        providers: ["line"],
      },
      user_metadata: {
        line_id: lineUserData.sub,
        display_name: safeName,
      },
      role: "authenticated",
      session_id: `line_${now}`,
    };

    console.log("生成 JWT 負載:", JSON.stringify(payload, null, 2));
    console.log("JWT Secret 長度:", jwtSecret.length);

    // 嘗試不同的密鑰處理方法
    let token;
    let successMethod = "";

    // 方法 1: 使用原始密鑰
    try {
      const secretUint8Array = new TextEncoder().encode(jwtSecret);
      token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .sign(secretUint8Array);
      successMethod = "使用原始字符串密鑰";
    } catch (error1) {
      console.error("方法 1 (原始密鑰) 失敗:", error1);

      // 方法 2: 嘗試解碼 base64
      try {
        const secretBuffer = Buffer.from(jwtSecret, "base64");
        token = await new jose.SignJWT(payload)
          .setProtectedHeader({ alg: "HS256", typ: "JWT" })
          .sign(secretBuffer);
        successMethod = "使用 base64 解碼的密鑰";
      } catch (error2) {
        console.error("方法 2 (base64 解碼) 失敗:", error2);

        // 方法 3: 嘗試處理特殊字符
        try {
          // 一些 JWT 密鑰可能包含特殊編碼
          const adjustedSecret = jwtSecret.replace(/\\n/g, "\n");
          const secretBuffer = new TextEncoder().encode(adjustedSecret);
          token = await new jose.SignJWT(payload)
            .setProtectedHeader({ alg: "HS256", typ: "JWT" })
            .sign(secretBuffer);
          successMethod = "使用處理特殊字符的密鑰";
        } catch (error3) {
          console.error("方法 3 (處理特殊字符) 失敗:", error3);
          return NextResponse.json(
            {
              error: "JWT 簽署失敗",
              details: "所有密鑰處理方法都失敗",
            },
            { status: 500 }
          );
        }
      }
    }

    console.log("JWT 簽署成功! 使用方法:", successMethod);

    // 解析並顯示生成的 JWT 詳情
    try {
      const parts = token.split(".");
      const decodedHeader = JSON.parse(atob(parts[0]));
      const decodedPayload = JSON.parse(atob(parts[1]));

      console.log("生成的 JWT:");
      console.log("- 頭部:", JSON.stringify(decodedHeader));
      console.log("- 負載:", JSON.stringify(decodedPayload, null, 2));
      console.log("- 算法:", decodedHeader.alg);
    } catch (parseError) {
      console.error("無法解析生成的 JWT:", parseError);
    }

    return NextResponse.json({ token });
  } catch (error: any) {
    console.error("生成 JWT 時發生錯誤:", error);

    return NextResponse.json(
      { error: "生成 JWT 失敗", details: error.message },
      { status: 500 }
    );
  }
}
