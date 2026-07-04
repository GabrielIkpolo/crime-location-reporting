"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, MapPin, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { reportSchema } from "@/lib/validations";
import { uploadMediaAction } from "@/app/actions/storage";
import { toast } from "sonner";
import { PageTransition } from "@/components/ui/PageTransition";

const CrimeMap = dynamic(() => import("@/components/Map/CrimeMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-muted">Loading Map...</div>
});

export default function ReportCrimePage() {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<[number, number]>([3.3792, 6.5244]); 
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    type: "",
    description: "",
    isAnonymous: false,
  });

  useEffect(() => {
    // Initial attempt to get user location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation([pos.coords.longitude, pos.coords.latitude]);
      },
      (err) => {
        console.error("Unable to get location", err);
        toast.error("Could not detect your current location. Please pinpoint it on the map.");
      },
      { enableHighAccuracy: true }
    );
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Handle Media Uploads
      const uploadFormData = new FormData();
      files.forEach(file => uploadFormData.append('files', file));
      
      const { urls } = await uploadMediaAction(uploadFormData);

      // 2. Validate data
      const validatedData = reportSchema.parse({
        ...formData,
        location: { type: "Point", coordinates: location },
        mediaUrls: urls,
      });

      // 3. Submit to API
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) throw new Error("Submission failed");

      toast.success("Report submitted successfully!", {
        description: "Thank you for helping keep the community safe.",
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      });

      // Reset form
      setFormData({ type: "", description: "", isAnonymous: false });
      setFiles([]);
    } catch (err: any) {
      toast.error("Submission Error", {
        description: err.message || "An unexpected error occurred",
        icon: <AlertCircle className="w-5 h-5 text-destructive" />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto p-4 max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 py-8">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <h1 className="text-3xl font-bold tracking-tight">Report Incident</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-2xl border shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="type">Crime Type</Label>
              <Input 
                id="type" 
                placeholder="e.g. Robbery, Theft, Assault" 
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Incident Description</Label>
              <Textarea 
                id="description" 
                placeholder="Provide as much detail as possible..." 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="min-h-[120px]"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border">
              <div className="space-y-0.5">
                <Label className="cursor-pointer">Report Anonymously</Label>
                <p className="text-xs text-muted-foreground">Your identity will remain hidden</p>
              </div>
              <Switch 
                checked={formData.isAnonymous} 
                onCheckedChange={(val) => setFormData({ ...formData, isAnonymous: val })}
              />
            </div>

            <div className="space-y-2">
              <Label>Evidence (Images/Videos)</Label>
              <div className="flex flex-col gap-4">
                <div className="relative group">
                  <Input 
                    type="file" 
                    multiple 
                    onChange={handleFileChange} 
                    className="cursor-pointer p-2"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <span key={i} className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-md flex items-center gap-1">
                        {f.name.substring(0, 12)}...
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full py-6 text-lg gap-2" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
              Submit Report
            </Button>
          </form>
        </div>

        <div className="h-[600px] lg:h-full min-h-[500px] rounded-2xl overflow-hidden border shadow-sm relative bg-muted">
          <div className="absolute top-4 left-4 z-[1000] bg-background/90 p-3 rounded-lg border text-xs font-medium shadow-sm pointer-events-none">
            📍 Click map to pinpoint exact location
          </div>
          <CrimeMap 
            mode="pick" 
            onLocationSelect={setLocation} 
            initialPos={location}
          />
        </div>
      </div>
    </PageTransition>
  );
}
