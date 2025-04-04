"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Supabase 會自動處理 OAuth 回調和會話設置
    // 我們只需將用戶重定向回主認證頁面
    router.push("/auth");
  }, [router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">處理認證中</h1>
        <div className="text-center py-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-gray-600">正在完成登入流程...</p>
        </div>
      </div>
    </div>
  );
}
