"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { Home, Upload, LayoutDashboard, CreditCard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// Event name constant for credit refresh
export const CREDIT_REFRESH_EVENT = 'refresh-user-credits';

export function Header() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Function to fetch user credits from API (memoized to prevent unnecessary re-renders)
  const fetchUserCredits = useCallback(async () => {
    if (session?.user?.id) {
      setIsLoading(true);
      
      try {
        // Get user credits from the API
        const response = await fetch(`/api/credits?userId=${session.user.id}`);
        if (response.ok) {
          const data = await response.json();
          setCredits(data.credits);
        } else {
          console.error("Error fetching credits from API");
          setCredits(0);
        }
      } catch (error) {
        console.error("Error fetching user credits:", error);
        setCredits(0);
      } finally {
        setIsLoading(false);
      }
    }
  }, [session]);

  // Listen for credit refresh events
  useEffect(() => {
    // Custom event listener for credit refreshes
    const handleCreditRefresh = (event: Event) => {
      console.log("Credit refresh event received", (event as CustomEvent)?.detail);
      fetchUserCredits();
    };
    
    // Add event listener
    if (typeof window !== 'undefined') {
      window.addEventListener(CREDIT_REFRESH_EVENT, handleCreditRefresh);
    }
    
    return () => {
      // Clean up when component unmounts
      if (typeof window !== 'undefined') {
        window.removeEventListener(CREDIT_REFRESH_EVENT, handleCreditRefresh);
      }
    };
  }, [fetchUserCredits]);

  // Initial fetch of user credits
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserCredits();
    } else {
      setIsLoading(false);
    }
  }, [session]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const navItems = [
    {
      name: "Home",
      url: "/",
      icon: Home,
    },
    {
      name: "Upload",
      url: "/upload",
      icon: Upload,
    },
    ...(isAuthenticated ? [
      {
        name: "Credits",
        url: "/credits",
        icon: CreditCard,
      }
    ] : [])
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between w-full px-6 py-4">
      <div className="flex-1"></div>
      
      <NavBar items={navItems} />
      
      <div className="flex-1 flex justify-end items-center gap-4">
        {isAuthenticated ? (
          <>
            <div className="bg-blue-900/30 px-4 py-2 rounded-full">
              <span className="text-sm font-medium text-white">
                {isLoading ? '...' : `${credits} credits`}
              </span>
            </div>
            
            <div className="bg-blue-900/30 px-4 py-2 rounded-full">
              <span className="text-sm font-medium text-white">
                {session.user.name || session.user.email}
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="rounded-full hover:bg-destructive/10 hover:text-destructive text-white"
            >
              <LogOut size={18} />
            </Button>
          </>
        ) : (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => router.push('/auth/signin')}
              className="px-4 bg-blue-900/30 text-white border-blue-500/50 hover:bg-blue-800/50"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => router.push('/auth/signup')}
              className="px-4 bg-blue-500 hover:bg-blue-600 text-white"
            >
              Sign Up
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 