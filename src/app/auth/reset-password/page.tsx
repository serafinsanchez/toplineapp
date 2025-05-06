"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Create a separate component for handling search params
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  // Check if we have a valid hash from the URL
  useEffect(() => {
    const checkHash = async () => {
      // The hash is automatically handled by Supabase Auth
      // We just need to check if we're in a valid session
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        setIsError(true);
        setMessage("Invalid or expired password reset link. Please request a new one.");
      }
    };
    
    checkHash();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    // Validate password
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // Update the password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      // Password reset successful
      setIsSuccess(true);
      setMessage("Your password has been reset successfully.");
      
      // Redirect to sign in page after a delay
      setTimeout(() => {
        router.push("/auth/signin");
      }, 3000);
    } catch (error: any) {
      console.error("Password reset error:", error);
      setMessage(error.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-black/20 backdrop-blur-xl rounded-xl border border-white/10">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your new password below
        </p>
      </div>

      {isError ? (
        <div className="space-y-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
            <p className="text-white">{message}</p>
          </div>
          <div className="text-center">
            <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
              Request a new password reset link
            </Link>
          </div>
        </div>
      ) : isSuccess ? (
        <div className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
            <p className="text-white">{message}</p>
            <p className="text-white mt-2">Redirecting to sign in page...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {message && (
            <div className="text-red-500 text-sm font-medium">{message}</div>
          )}

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={isLoading}
          >
            {isLoading ? "Resetting..." : "Reset Password"} <Lock className="w-4 h-4" />
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPassword() {
  return (
    <AuroraBackground>
      <div className="min-h-screen w-full flex flex-col items-center justify-center">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </AuroraBackground>
  );
} 