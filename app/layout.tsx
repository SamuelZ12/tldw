import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from '@/contexts/auth-context';
import { UserMenu } from '@/components/user-menu';
import { ToastProvider } from '@/components/toast-provider';
import Link from 'next/link';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TLDW - Too Long; Didn't Watch",
  description: "Smart video navigation that transforms long YouTube videos into topic-driven learning experiences",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <header className="border-b">
              <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center space-x-2">
                  <span className="font-bold text-xl">TLDW</span>
                </Link>
                <UserMenu />
              </div>
            </header>
            <main className="flex-1">
              {children}
            </main>
          </div>
          <ToastProvider />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
