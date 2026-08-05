"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/ui/PageTransition";
import { Loader2, TrendingUp, ShieldCheck, AlertTriangle, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Report, CommunityAlert } from "@/types";

const CrimeMap = dynamic(() => import("@/components/Map/CrimeMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-muted">Loading Map...</div>
});

export default function PublicMapPage() {
  const [verifiedReports, setVerifiedReports] = useState<Report[]>([]);
  const [communityAlerts, setCommunityAlerts] = useState<CommunityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, highRisk: 0, crowdAlerts: 0 });
  const [mapCenter, setMapCenter] = useState<[number, number]>([3.3792, 6.5244]);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch("/api/reports");
        if (!res.ok) throw new Error("Failed to fetch reports");
        const data = await res.json();
        
        const verified = data.verified || [];
        const alerts = data.communityAlerts || [];

        setVerifiedReports(verified);
        setCommunityAlerts(alerts);
        
        setStats({
          total: verified.length,
          highRisk: verified.filter((r: Report) => r.riskLevel === "HIGH").length,
          crowdAlerts: alerts.length,
        });
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
      <div className="h-screen w-full flex flex-col overflow-hidden">
        {/* Header */}
        <header className="p-4 bg-background border-b flex flex-col md:flex-row justify-between items-center gap-4 z-10 shadow-sm shrink-0">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Public Safety Dashboard</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Verified data & community-sourced warnings</p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3">
            <Card className="bg-primary/5 border-primary/20 shadow-none">
              <CardContent className="p-2 px-3 md:px-4 flex items-center gap-2 md:gap-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <div className="text-xs">
                  <span className="block font-bold text-sm md:text-base">{stats.total}</span>
                  <span className="text-muted-foreground hidden sm:inline">Verified</span>
                  <span className="text-muted-foreground sm:hidden">V</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200 shadow-none">
              <CardContent className="p-2 px-3 md:px-4 flex items-center gap-2 md:gap-3">
                <Users className="w-4 h-4 text-orange-600" />
                <div className="text-xs">
                  <span className="block font-bold text-sm md:text-base">{stats.crowdAlerts}</span>
                  <span className="text-muted-foreground hidden sm:inline">Alerts</span>
                  <span className="text-muted-foreground sm:hidden">A</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20 shadow-none">
              <CardContent className="p-2 px-3 md:px-4 flex items-center gap-2 md:gap-3">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <div className="text-xs">
                  <span className="block font-bold text-sm md:text-base">{stats.highRisk}</span>
                  <span className="text-muted-foreground hidden sm:inline">High Risk</span>
                  <span className="text-muted-foreground sm:hidden">HR</span>
                </div>
              </CardContent>
            </Card>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-2 py-1 px-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] md:text-xs">Live</span>
            </Badge>
          </div>
        </header>
        
        <div className="flex-1 relative flex flex-col lg:flex-row overflow-hidden">
          {/* Map Area */}
          <main className="flex-1 relative min-h-[50vh] lg:min-h-full">
            {loading ? (
              <div className="h-full w-full flex flex-col items-center justify-center bg-muted gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">Loading safety data...</p>
              </div>
            ) : (
              <div className="h-full w-full p-1 md:p-2 lg:p-0">
                <CrimeMap 
                  mode="view" 
                  reports={verifiedReports} 
                  communityAlerts={communityAlerts} 
                  center={mapCenter}
                />
              </div>
            )}
          </main>

          {/* Sidebar (Hidden on mobile/tablet, visible on large screens) */}
          <aside className="hidden lg:block w-80 bg-background border-l overflow-y-auto p-4 space-y-6 shrink-0">
            <section className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-5 h-5" />
                Community Warnings
              </h3>
              <div className="space-y-3">
                {communityAlerts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No high-volume warnings.</p>
                ) : (
                  communityAlerts.map((alert, i) => (
                    <Card 
                      key={i} 
                      className="border-orange-200 bg-orange-50/50 cursor-pointer hover:border-orange-400 hover:shadow-md transition-all"
                      onClick={() => setMapCenter([alert.location.coordinates[1], alert.location.coordinates[0]])}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm text-orange-700">{alert.type}</span>
                          <Badge variant="outline" className="text-[10px] bg-white">Unverified</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {alert.description}
                        </p>
                        <div className="text-[10px] font-bold text-orange-600 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {alert.reportCount} reports
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </section>

            <section className="space-y-3 pt-4 border-t">
              <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
                <ShieldCheck className="w-5 h-5" />
                Verified Incidents
              </h3>
              <div className="space-y-3">
                {verifiedReports.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No verified reports.</p>
                ) : (
                  verifiedReports.slice(0, 15).map((report, i) => (
                    <Card 
                      key={i} 
                      className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setMapCenter([report.location.coordinates[1], report.location.coordinates[0]])}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm">{report.type}</span>
                          <Badge variant="outline" className="text-[10px] h-5">{report.riskLevel}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {report.description}
                        </p>
                        <div className="text-[10px] text-muted-foreground flex justify-between items-center">
                          <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                          <span className="text-primary font-medium flex items-center gap-1">
                            Verified ✓
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </PageTransition>
  );
}
