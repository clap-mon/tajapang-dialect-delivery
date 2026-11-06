import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "타자팡: 방언 대모험 / Taja Pang",
  description: "배움팡 친구들과 달리고 방언 보스와 타자로 겨루는 우리말 타자 게임!",
};

import MobileBlockGuard from "./components/MobileBlockGuard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <MobileBlockGuard />
        {children}
      </body>
    </html>
  );
}
