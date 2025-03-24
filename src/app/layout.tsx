import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Topline - Extract Acapella and Instrumental Stems",
  description: "Separate vocals, drums, bass, and other instruments from any song in seconds. Perfect for music producers, remixers, and DJs.",
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
        <SessionProvider>
          <AppLayout>{children}</AppLayout>
          <Toaster position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
