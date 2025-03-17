"use client";

import { useSession } from "next-auth/react";
import { Header } from "./Header";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <div className="min-h-screen flex flex-col">
      {isAuthenticated && <Header />}
      <main className="flex-1">{children}</main>
    </div>
  );
} 