"use client";

import React, { useState, useEffect } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, Globe, Save, Users } from "lucide-react";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<{ [key: string]: string }>({
    CROWD_THRESHOLD: "5",
    DECAY_DAYS: "30",
    DISTANCE_THRESHOLD: "0.002",
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          const mapped: { [key: string]: string } = {};
          data.forEach((s: any) => {
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
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(`${key} updated successfully`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto p-4 py-8 max-w-4xl space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg text-primary-foreground">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
            <p className="text-muted-foreground">Manage global parameters for the reporting system.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Crowdsourcing
              </CardTitle>
              <CardDescription>Control how community alerts are triggered.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="CROWD_THRESHOLD">Minimum Reports for Alert</Label>
                <div className="flex gap-2">
                  <Input 
                    id="CROWD_THRESHOLD" 
                    type="number" 
                    value={settings.CROWD_THRESHOLD || "5"}
                    onChange={(e) => setSettings({...settings, CROWD_THRESHOLD: e.target.value})}
                  />
                  <Button onClick={() => handleUpdateSetting("CROWD_THRESHOLD", settings.CROWD_THRESHOLD)} disabled={loading}>
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Number of reports within a radius to trigger a pulsing orange "Community Alert".
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="DISTANCE_THRESHOLD">Clustering Radius (Dec. Deg)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="DISTANCE_THRESHOLD" 
                    type="text" 
                    value={settings.DISTANCE_THRESHOLD || "0.002"}
                    onChange={(e) => setSettings({...settings, DISTANCE_THRESHOLD: e.target.value})}
                  />
                  <Button onClick={() => handleUpdateSetting("DISTANCE_THRESHOLD", settings.DISTANCE_THRESHOLD)} disabled={loading}>
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Approx distance in decimal degrees (0.001 ≈ 111m).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" /> Data Retention
              </CardTitle>
              <CardDescription>Control the visibility of historical data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="DECAY_DAYS">Public Visibility Window (Days)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="DECAY_DAYS" 
                    type="number" 
                    value={settings.DECAY_DAYS || "30"}
                    onChange={(e) => setSettings({...settings, DECAY_DAYS: e.target.value})}
                  />
                  <Button onClick={() => handleUpdateSetting("DECAY_DAYS", settings.DECAY_DAYS)} disabled={loading}>
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Reports older than this value will be hidden from the public map.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
