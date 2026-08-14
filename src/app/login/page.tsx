"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/ui/PageTransition";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [showVerifyNotice, setShowVerifyNotice] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleResendVerification = async () => {
    if (!formData.email) {
      toast.error("Enter your email first", {
        description: "Please enter the email address you registered with.",
      });
      return;
    }

    setResendingVerification(true);
    try {
      const response = await fetch("/api/auth/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Verification email sent!", {
          description: "Check your inbox (and spam folder) for the verification link.",
        });
      } else {
        toast.error("Failed to resend", {
          description: data.error || "Please try again later.",
        });
      }
    } catch (err) {
      console.error("[Resend Verification] Error:", err);
      toast.error("Network error", { description: "Could not connect. Please try again." });
    } finally {
      setResendingVerification(false);
    }
  };

  const handleGoogleSignIn = async () => {
    await signIn("google", { callbackUrl: "/" });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      // Check if user has unverified email (auth.config returns user with flag)
      const resultAny = result as any;
      if (resultAny?.user && resultAny.user.unverifiedEmail) {
        setShowVerifyNotice(true);
        toast.warning("Email Not Verified", {
          description: "Please verify your email before logging in. Click 'Resend Verification Email' below.",
        });
      } else if (result?.error) {
        toast.error("Login Failed", {
          description: "Invalid email or password. Please try again.",
        });
      } else {
        toast.success("Welcome back!");
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("[Login] Unexpected error:", err);
      toast.error("Login failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to manage your reports and safety</p>
          </div>

          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-center">Login</CardTitle>
              <CardDescription className="text-center">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@example.com" 
                      className="pl-10" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-10" 
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
                    <span>Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" className="w-full gap-2 py-6 text-lg" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Sign In
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <Button variant="outline" className="w-full gap-2 py-6" onClick={handleGoogleSignIn}>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button>
            </CardFooter>
          </Card>
          {/* Email Verification Notice */}
          {showVerifyNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800/50 shadow-sm"
            >
              <div className="flex gap-3">
                <div className="shrink-0 mt-0.5">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-3 flex-1">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    Email Verification Required
                  </p>
                  <p className="text-xs leading-relaxed text-blue-700/90 dark:text-blue-400/80">
                    Your account needs email verification before you can log in. We&apos;ve sent a verification link to your registered email.
                  </p>
                  <Button
                    onClick={handleResendVerification}
                    disabled={resendingVerification || !formData.email}
                    size="sm"
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full"
                  >
                    {resendingVerification ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    {resendingVerification ? "Sending..." : "Resend Verification Email"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          <p className="text-center mt-8 text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-semibold">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </PageTransition>
  );
}
