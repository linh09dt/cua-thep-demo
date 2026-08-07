import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Demo Cửa Thép",
  description: "Demo quản lý sản xuất cửa thép",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
