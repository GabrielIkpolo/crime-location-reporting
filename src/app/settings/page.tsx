"use client";

import React, { useState, useEffect } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { User, Mail, Bell, Lock } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // In a real app, this would call a /api/user/update endpoint
      // For now, we simulate the success
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto p-4 py-12 max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">Manage your profile and account preferences.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Settings</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button variant="ghost" className="justify-start gap-2 w-full">
                  <User className="w-4 h-4" /> Basic Info
                </Button>
                <Button variant="ghost" className="justify-start gap-2 w-full">
                  <Bell className="w-4 h-4" /> Notifications
                </Button>
                <Button variant="ghost" className="justify-start gap-2 w-full">
                  <Lock className="w-4 h-4" /> Security
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your public profile details.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="name" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="pl-10" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        type="email" 
                        value={formData.email}
                        disabled
                        className="pl-10 bg-muted" 
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
