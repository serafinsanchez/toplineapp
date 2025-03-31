"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";

// More comprehensive email validation regex
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const validateEmail = (email: string) => {
    return emailRegex.test(email);
  };

  const createUserProfile = async (userId: string, userName: string, userEmail: string) => {
    try {
      const response = await fetch('/api/profile/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userName,
          userEmail
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("Error creating user profile:", data.error);
        return false;
      }
      
      console.log("User profile created/updated successfully");
      return true;
    } catch (error) {
      console.error("Error creating/updating user profile:", error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    // Validate email format
    if (!validateEmail(email)) {
      setError("That email doesn't look quite right. Can you double-check it?");
      setIsLoading(false);
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Looks like your passwords aren't matching, mind trying again?");
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Your password is a bit on the short side. Let's beef it up to at least 6 characters!");
      setIsLoading(false);
      return;
    }

    try {
      // Register with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), // Normalize email
        password,
        options: {
          data: {
            full_name: name,
            name: name, // Add name field explicitly
          },
        },
      });

      if (signUpError) {
        console.error("Signup error:", signUpError);
        
        // Handle specific error messages
        if (signUpError.message.includes("invalid")) {
          setError("That email is giving us side-eye. Could you try a different one?");
        } else if (signUpError.message.includes("already registered") || signUpError.message.includes("already in use")) {
          setError("Looks like you're already signed up! Head over to sign in instead.");
        } else if (signUpError.message.includes("disposable")) {
          setError("We're looking for a long-term relationship. Mind using a non-disposable email?");
        } else {
          setError(signUpError.message || "Oops! We hit a snag creating your account. Let's try that again!");
        }
        
        setIsLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        setError("Looks like you're already part of the crew! Head over to sign in instead.");
        setIsLoading(false);
        return;
      }

      // If user was created successfully, create/update the user profile
      if (data?.user?.id) {
        // Create user profile with name
        await createUserProfile(
          data.user.id,
          name,
          email.trim().toLowerCase()
        );
        
        // Update user metadata
        await supabase.auth.updateUser({
          data: {
            full_name: name,
            name: name,
          }
        });
      }

      // Check if email confirmation is required
      if (data?.user && !data.session) {
        setSuccessMessage("Account created! Please check your email to confirm your registration.");
        setIsLoading(false);
        return;
      }

      // Sign in the user automatically if no email confirmation is required
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
        callbackUrl: '/upload'
      });

      if (result?.error) {
        setSuccessMessage("Account created! Please sign in manually.");
        setIsLoading(false);
        setTimeout(() => {
          router.push("/auth/signin");
        }, 2000);
        return;
      }

      // Redirect to the upload page on successful registration and login
      console.log("Redirecting to upload page...");
      router.push("/upload");
    } catch (error: any) {
      console.error("Sign up error:", error);
      setError(error?.message || "Well, that was unexpected! Our system hiccupped. Mind trying again?");
      setIsLoading(false);
    }
  };

  return (
    <AuroraBackground>
      <div className="min-h-screen w-full flex flex-col items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-8 bg-black/20 backdrop-blur-xl rounded-xl border border-white/10">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">Sign Up</h1>
            <p className="mt-2 text-sm text-white/70">
              Create an account to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="bg-blue-900/20 border-blue-500/30 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-blue-900/20 border-blue-500/30 text-white"
              />
              <p className="text-xs text-white/70">
                Use a valid email address that you have access to
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-blue-900/20 border-blue-500/30 text-white"
              />
              <p className="text-xs text-white/70">
                Must be at least 6 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-blue-900/20 border-blue-500/30 text-white"
              />
            </div>

            {error && (
              <div className="text-red-300 text-sm font-medium bg-red-900/20 p-2 rounded">{error}</div>
            )}
            
            {successMessage && (
              <div className="text-green-300 text-sm font-medium bg-green-900/20 p-2 rounded">{successMessage}</div>
            )}

            <Button
              type="submit"
              className="w-full gap-2 bg-blue-500 hover:bg-blue-600 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Sign Up"} <UserPlus className="w-4 h-4" />
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-white/70">Already have an account? </span>
            <Button
              variant="link"
              className="text-blue-300 hover:text-blue-200 p-0"
              onClick={() => router.push("/auth/signin")}
            >
              Sign In
            </Button>
          </div>

          <div className="text-center text-sm">
            <Button
              variant="link"
              className="text-white/70 hover:text-blue-300"
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