"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";
import Link from "next/link";

// Email validation regex
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validate email format
    if (!validateEmail(email)) {
      setError("Hmm, that email looks a bit off. Mind double-checking it?");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
        callbackUrl: '/upload'
      });

      if (result?.error) {
        if (result.error.includes("CredentialsSignin")) {
          setError("Oops! Your email and password aren't working well together. Want to try again?");
        } else {
          setError(result.error || "Yikes! Something tripped us up. Let's give it another shot!");
        }
        setIsLoading(false);
        return;
      }

      // Redirect to the upload page on successful login
      console.log("Redirecting to upload page...");
      router.push("/upload");
    } catch (error: any) {
      console.error("Sign in error:", error);
      setError(error?.message || "Well, that was unexpected! Our system hiccupped. Mind trying again?");
      setIsLoading(false);
    }
  };

  return (
    <AuroraBackground>
      <div className="min-h-screen w-full flex flex-col items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-8 bg-black/20 backdrop-blur-xl rounded-xl border border-white/10">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Sign In</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <div className="text-right">
                <Link 
                  href="/auth/forgot-password" 
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm font-medium">{error}</div>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"} <LogIn className="w-4 h-4" />
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Button
              variant="link"
              className="text-primary p-0"
              onClick={() => router.push("/auth/signup")}
            >
              Sign Up
            </Button>
          </div>

          <div className="text-center text-sm">
            <Button
              variant="link"
              className="text-muted-foreground hover:text-primary"
              onClick={() => router.push("/")}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
} 