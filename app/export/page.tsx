"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ExportPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white p-4 flex items-center border-b">
        <Link 
          href="/profile" 
          className="mr-4 p-2 rounded-full hover:bg-gray-100"
          aria-label="返回"
          tabIndex={0}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">匯出帳本</h1>
      </div>
      
      <div className="flex-1 p-4">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <p className="text-gray-600">
            這裡將會是匯出帳本功能，目前尚未實作。
          </p>
        </div>
      </div>
    </div>
  );
} 