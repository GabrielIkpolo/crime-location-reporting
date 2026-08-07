"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, MapPin, Upload, AlertCircle, CheckCircle2, X } from "lucide-react";
import { reportSchema, CRIME_TYPES } from "@/lib/validations";
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
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
    // Reset input value so same file can be selected again if removed
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Pre-submit Client-side Validation
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large (max 10MB).`);
        }
        const validTypes = [
          'image/jpeg', 'image/png', 'image/webp',
          'video/mp4', 'video/quicktime', 'video/webm',
          'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3',
          'application/pdf'
        ];
        if (!validTypes.includes(file.type)) {
          throw new Error(`File ${file.name} is an invalid type. Allowed: images, videos, audio (mp3, wav), and PDFs.`);
        }
      }

      // 2. Handle Media Uploads
      const uploadFormData = new FormData();
      files.forEach(file => uploadFormData.append('files', file));
      
      let urls: string[] = [];
      if (files.length > 0) {
        const uploadResult = await uploadMediaAction(uploadFormData);
        urls = uploadResult.urls;
      }

      // 3. Validate data
      const validation = reportSchema.safeParse({
        ...formData,
        location: { type: "Point", coordinates: location },
        mediaUrls: urls,
      });

      if (!validation.success) {
        const firstError = validation.error.issues[0]?.message || "Invalid report data";
        throw new Error(firstError);
      }

      const validatedData = validation.data;

      // 4. Submit to API
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedData),
      });

      const resultData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(resultData.error || "Submission failed");
      }

      toast.success("Report submitted successfully!", {
        description: "Thank you for helping keep the community safe.",
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      });

      // Reset form
      setFormData({ type: "", description: "", isAnonymous: false });
      setFiles([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("Submit Error:", err);
      toast.error("Submission Error", {
        description: message,
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
              <Select 
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value ?? "" })}
                required
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select crime type" />
                </SelectTrigger>
                <SelectContent>
                  {CRIME_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <div className="flex items-center justify-between">
                <Label>Evidence (Images/Videos)</Label>
                {files.length > 0 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFiles}
                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <div className="relative group">
                  <Input 
                    type="file" 
                    multiple 
                    onChange={handleFileChange} 
                    className="cursor-pointer p-2"
                    accept="image/*,video/*,audio/*,.pdf"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                
                {files.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {files.map((f, i) => (
                      <div key={i} className="relative aspect-square rounded-xl border bg-muted overflow-hidden group/file">
                        {/* Image Preview */}
                        {f.type.startsWith('image/') ? (
                          <Image
                            src={URL.createObjectURL(f)}
                            alt={f.name}
                            fill
                            className="object-cover"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : f.type === 'application/pdf' ? (
                          /* PDF Preview */
                          <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/20">
                            <svg className="w-10 h-10 text-red-500 mb-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                            </svg>
                            <span className="text-[10px] text-red-500 font-medium">PDF</span>
                          </div>
                        ) : f.type.startsWith('audio/') ? (
                          /* Audio Preview */
                          <div className="w-full h-full flex flex-col items-center justify-center bg-purple-50 dark:bg-purple-950/20">
                            <svg className="w-10 h-10 text-purple-500 mb-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12,3V13.55A4,4 0 1,0 14,11.75V7H19V18H21V7H23V11.75A4,4 0 1,1 12,16.55Z" />
                            </svg>
                            <span className="text-[10px] text-purple-500 font-medium">AUDIO</span>
                          </div>
                        ) : (
                          /* Video Preview */
                          <div className="w-full h-full flex items-center justify-center">
                            <Upload className="w-8 h-8 text-muted-foreground opacity-50" />
                          </div>
                        )}
                        
                        {/* Hover overlay with remove button */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/file:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => removeFile(i)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* File name */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[10px] text-white truncate">
                          {f.name}
                        </div>
                      </div>
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
