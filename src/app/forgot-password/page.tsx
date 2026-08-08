"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/ui/PageTransition";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        // In development, show the reset link for testing
        if (data.resetLink) {
          setResetLink(data.resetLink);
        }
        toast.success("Reset link sent!", {
          description: "Check your email for the password reset instructions.",
        });
      } else {
        toast.error("Error", { description: data.error || "Failed to send reset link." });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("[ForgotPassword] Unexpected error:", err);
      toast.error("Error", { description: message });
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
            <h1 className="text-3xl font-bold tracking-tight">Forgot Password</h1>
            <p className="text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
          </div>

          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            {!submitted ? (
              <>
                <CardHeader>
                  <CardTitle className="text-center">Reset Password</CardTitle>
                  <CardDescription className="text-center">
                    Enter the email address associated with your account.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="name@example.com" 
                          className="pl-10" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full gap-2 py-6 text-lg" disabled={loading}>
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      Send Reset Link
                    </Button>
                  </form>
                </CardContent>
                {resetLink && (
                  <div className="px-6 pb-4">
                    <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1">
                      <p className="font-semibold text-primary">Dev Mode — Reset Link:</p>
                      <a 
                        href={resetLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline break-all hover:text-blue-700"
                      >
                        {resetLink}
                      </a>
                    </div>
                  </div>
                )}
                <CardFooter className="flex justify-center">
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Login
                  </Link>
                </CardFooter>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle className="text-center flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    Check Your Email
                  </CardTitle>
                  <CardDescription className="text-center">
                    We&apos;ve sent a password reset link to<br/>
                    <span className="font-semibold text-foreground">{email}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    The link expires in 1 hour. Didn&apos;t receive the email? Check your spam folder or try again.
                  </p>
                  {resetLink && (
                    <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1">
                      <p className="font-semibold text-primary">Dev Mode — Direct Link:</p>
                      <a 
                        href={resetLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline break-all hover:text-blue-700"
                      >
                        {resetLink}
                      </a>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setSubmitted(false)}
                  >
                    Resend Email
                  </Button>
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Login
                  </Link>
                </CardFooter>
              </>
            )}
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
