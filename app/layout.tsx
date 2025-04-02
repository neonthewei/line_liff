import type React from "react";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/shared/ui";
import { BottomNav } from "@/components/shared/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "旺來記帳",
  description: "旺來記帳",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <div>{children}</div>
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
