import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Model Envanter Yönetimi",
  description:
    "Kuveyt Türk Model Inventory Management — duplicate detection, similarity search, and inventory health.",
  icons: {
    icon: "/favicon.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-slate-50 antialiased watermark-bg`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
