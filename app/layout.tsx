import type { Metadata, Viewport } from "next"; // ← 型定義を追加
import React from "react";
import "./globals.css";
import { Providers } from "../components/Providers";
import { DevTools } from "../components/DevTools";

// 1. アプリ名とPWA設定 (ここがMisepoの看板になります)
export const metadata: Metadata = {
  title: "Misepo - お店の投稿、まるなげAI",
  description: "店舗オーナー向けAI投稿作成アプリ",
  manifest: "/manifest.json", // マニフェストファイルの読み込み
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Misepo", // ホーム画面に追加した時の名前
  },
  formatDetection: {
    telephone: false,
  },
};

// 2. スマホ表示の最適化 (iPhoneのノッチ対応やズーム防止)
export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // アプリっぽくするためピンチズームを無効化
  viewportFit: "cover", // ノッチまで広げる
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      {/* safe-area-top / safe-area-bottom: iPhone X以降のノッチ対応クラス
        select-none: アプリっぽくするため、長押し選択を無効化
      */}
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen safe-area-top safe-area-bottom select-none">
        <Providers>
          {children}
          <DevTools />
        </Providers>
      </body>
    </html>
  );
}