import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "废话检测局 · Bureau of Linguistic Redundancy",
  description: "你的废话含量达标了吗？由 AI 驱动的官僚主义检测系统。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-background text-on-background min-h-screen">
        {children}
      </body>
    </html>
  );
}
