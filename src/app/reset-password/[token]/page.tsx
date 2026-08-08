"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Lock, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/ui/PageTransition";
import { toast } from "sonner";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const resolvedParams = await params;
        setToken(resolvedParams.token);
        
        // Validate token by making a lightweight check
        const response = await fetch(`/api/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resolvedParams.token, newPassword: "validate" }),
        });

        // If the endpoint returns 400 with a specific message about password length, 
        // it means the token is valid (since we're sending an invalid password)
        if (response.status === 400) {
          const data = await response.json();
          if (data.error?.includes("Password must be at least")) {
            setValidating(false);
            return;
          }
        }

        // Token is invalid or expired
        toast.error("Invalid Link", { description: "This password reset link is invalid or has expired." });
      } catch (err) {
        console.error("[ResetPassword] Validation error:", err);
        toast.error("Error", { description: "Could not validate the reset link. Please try again." });
      } finally {
        setValidating(false);
      }
    })();
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match", { description: "Please make sure both passwords are the same." });
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Weak password", { description: "Password must be at least 8 characters long." });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success("Password Reset!", { description: "Your password has been updated. You can now log in." });
      } else {
        toast.error("Error", { description: data.error || "Failed to reset password." });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("[ResetPassword] Unexpected error:", err);
      toast.error("Error", { description: message });
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
          <Card className="w-full max-w-md border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Validating reset link...</p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (success) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  Password Reset Successful!
                </CardTitle>
                <CardDescription className="text-center">
                  Your password has been updated successfully.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  You can now log in with your new password.
                </p>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Link href="/login" className="w-full">
                  <Button className="w-full gap-2 py-6 text-lg">
                    <ArrowLeft className="w-4 h-4" />
                    Go to Login
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

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
            <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
            <p className="text-muted-foreground">Enter your new password below.</p>
          </div>

          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-center">Choose New Password</CardTitle>
              <CardDescription className="text-center">
                Your password must be at least 8 characters long.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="newPassword" 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      className="pl-10 pr-10" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="confirmPassword" 
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••" 
                      className="pl-10 pr-10" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2 py-6 text-lg" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  Reset Password
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </Link>
            </CardFooter>
          </Card>

          <p className="text-center mt-8 text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link href="/login" className="text-primary hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </PageTransition>
  );
}
