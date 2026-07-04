"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/ui/PageTransition";
import { Loader2 } from "lucide-react";

const CrimeMap = dynamic(() => import("@/components/Map/CrimeMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-muted">Loading Map...</div>
});

export default function PublicMapPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch("/api/reports");
        if (!res.ok) throw new Error("Failed to fetch reports");
        const data = await res.json();
        setReports(data);
      } catch (err) {
        console.error("Failed to fetch reports", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  return (
    <PageTransition>
      <div className="h-screen w-full flex flex-col">
        <div className="p-4 bg-background border-b flex justify-between items-center z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Public Safety Map</h1>
            <p className="text-sm text-muted-foreground">View verified crime hotspots in your area</p>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live Updates
          </Badge>
        </div>
        
        <div className="flex-1 relative">
          {loading ? (
            <div className="h-full w-full flex flex-col items-center justify-center bg-muted gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground font-medium">Loading crime data...</p>
            </div>
          ) : (
            <CrimeMap mode="view" reports={reports} />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
