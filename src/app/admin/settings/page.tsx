"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, Globe, Save, Users } from "lucide-react";
import { SystemSetting } from "@/types";

interface SettingsState {
  [key: string]: string;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({
    CROWD_THRESHOLD: "5",
    DECAY_DAYS: "30",
    DISTANCE_THRESHOLD: "0.002",
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data: SystemSetting[] = await res.json();
          const mapped: SettingsState = {};
          data.forEach((s) => {
            mapped[s.key] = s.value;
          });
          setSettings(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    }
    fetchSettings();
  }, []);

  const handleUpdateSetting = async (key: string, value: string) => {
    if (value === "") {
      toast.error("Value cannot be empty");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Update failed");
      }
      toast.success(`${key.replace(/_/g, ' ')} updated successfully`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Update failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 py-12 max-w-6xl space-y-12">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <Settings className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">System Configuration</h1>
          <p className="text-lg text-muted-foreground mt-1">Manage global parameters for the reporting system.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg border-none bg-card/50 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Users className="w-6 h-6 text-primary" /> Crowdsourcing
            </CardTitle>
            <CardDescription className="text-base">Control how community alerts are triggered.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="CROWD_THRESHOLD" className="text-sm font-medium">Minimum Reports for Alert</Label>
              <div className="flex gap-3">
                <Input 
                  id="CROWD_THRESHOLD" 
                  type="number" 
                  className="h-11"
                  value={settings.CROWD_THRESHOLD}
                  onChange={(e) => setSettings({...settings, CROWD_THRESHOLD: e.target.value})}
                />
                <Button 
                  onClick={() => handleUpdateSetting("CROWD_THRESHOLD", settings.CROWD_THRESHOLD)} 
                  disabled={loading}
                  className="h-11 px-4"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground/80 leading-relaxed">
                Number of reports within a radius to trigger a pulsing orange &quot;Community Alert&quot;.
              </p>
            </div>
            <div className="space-y-3">
              <Label htmlFor="DISTANCE_THRESHOLD" className="text-sm font-medium">Clustering Radius (Dec. Deg)</Label>
              <div className="flex gap-3">
                <Input 
                  id="DISTANCE_THRESHOLD" 
                  type="text" 
                  className="h-11"
                  value={settings.DISTANCE_THRESHOLD}
                  onChange={(e) => setSettings({...settings, DISTANCE_THRESHOLD: e.target.value})}
                />
                <Button 
                  onClick={() => handleUpdateSetting("DISTANCE_THRESHOLD", settings.DISTANCE_THRESHOLD)} 
                  disabled={loading}
                  className="h-11 px-4"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground/80 leading-relaxed">
                Approx distance in decimal degrees (0.001 ≈ 111m).
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-none bg-card/50 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Globe className="w-6 h-6 text-primary" /> Data Retention
            </CardTitle>
            <CardDescription className="text-base">Control the visibility of historical data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="DECAY_DAYS" className="text-sm font-medium">Public Visibility Window (Days)</Label>
              <div className="flex gap-3">
                <Input 
                  id="DECAY_DAYS" 
                  type="number" 
                  className="h-11"
                  value={settings.DECAY_DAYS}
                  onChange={(e) => setSettings({...settings, DECAY_DAYS: e.target.value})}
                />
                <Button 
                  onClick={() => handleUpdateSetting("DECAY_DAYS", settings.DECAY_DAYS)} 
                  disabled={loading}
                  className="h-11 px-4"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground/80 leading-relaxed">
                Reports older than this value will be hidden from the public map.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
