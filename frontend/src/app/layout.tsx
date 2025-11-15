import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { MockServiceWorkerProvider } from "@/components/MockServiceWorkerProvider";
import { AuthProvider } from "@/features/auth/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgroPlanner - Система управления сельскохозяйственными полями",
  description: "Профессиональный инструмент для планирования и мониторинга сельскохозяйственных полей",
  keywords: "сельское хозяйство, поля, планирование, мониторинг, агрономия",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <MockServiceWorkerProvider />
          <ThemeInitializer />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
