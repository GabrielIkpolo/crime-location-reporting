"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/ui/PageTransition";
import { Loader2, TrendingUp, ShieldCheck, AlertTriangle, Users, MapPin, ZoomIn, ZoomOut, LocateFixed, Filter, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Report, CommunityAlert } from "@/types";

const CrimeMap = dynamic(() => import("@/components/Map/CrimeMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-muted">Loading Map...</div>
});

// Nigeria bounding box for overview
const NIGERIA_CENTER: [number, number] = [8.6753, 6.0]; // Center of Nigeria
const NIGERIA_ZOOM = 6; // Zoom level to show all of Nigeria

type CardType = "verified" | "crowd";

export default function PublicMapPage() {
  const [verifiedReports, setVerifiedReports] = useState<Report[]>([]);
  const [communityAlerts, setCommunityAlerts] = useState<CommunityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, highRisk: 0, crowdAlerts: 0 });
  const [mapCenter, setMapCenter] = useState<[number, number]>(NIGERIA_CENTER);
  const [activeTab, setActiveTab] = useState<CardType>("verified");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showCrowdAlerts, setShowCrowdAlerts] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadReports() {
      try {
        const res = await fetch("/api/reports");
        if (!res.ok) throw new Error("Failed to fetch reports");
        const data = await res.json();

        if (!mounted) return;

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
        if (mounted) setLoading(false);
      }
    }

    loadReports();

    // Periodic revalidation — refresh data every 5 minutes in background
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/reports", { cache: "no-cache" });
        if (!res.ok) return;
        const data = await res.json();

        setVerifiedReports(data.verified || []);
        setCommunityAlerts(data.communityAlerts || []);

        setStats({
          total: (data.verified || []).length,
          highRisk: (data.verified || []).filter((r: Report) => r.riskLevel === "HIGH").length,
          crowdAlerts: (data.communityAlerts || []).length,
        });
      } catch {
        // Silently ignore background refresh failures
      }
    }, 5 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleCardClick = useCallback((type: CardType, id: string, coordinates: [number, number]) => {
    setSelectedCardId(id);
    setMapCenter(coordinates);
    
    // Scroll to map on mobile
    if (typeof window !== 'undefined') {
      const mapEl = document.querySelector('[class*="leaflet-container"]');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-background to-muted/20">
        {/* Header */}
        <header className="sticky top-0 z-30 p-4 md:p-6 bg-background/95 backdrop-blur-sm border-b shadow-sm shrink-0">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2 justify-center md:justify-start">
                <ShieldCheck className="w-6 h-6 text-primary" />
                Public Safety Dashboard
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Verified data & community-sourced warnings across Nigeria
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3">
              {/* View Toggle */}
              <Button
                variant={showCrowdAlerts ? "default" : "outline"}
                size="sm"
                onClick={() => setShowCrowdAlerts(!showCrowdAlerts)}
                className={`gap-1 h-8 px-3 text-xs transition-all ${showCrowdAlerts ? "" : "opacity-60"}`}
              >
                {showCrowdAlerts ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                Crowd Alerts
              </Button>

              {/* Nigeria Overview Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMapCenter(NIGERIA_CENTER)}
                className="gap-1 h-8 px-3 text-xs"
              >
                <ZoomIn className="w-3 h-3" />
                Nigeria View
              </Button>

              {/* Locate Me Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => setMapCenter([pos.coords.longitude, pos.coords.latitude]),
                    () => {},
                    { enableHighAccuracy: true }
                  );
                }}
                className="gap-1 h-8 px-3 text-xs"
              >
                <LocateFixed className="w-3 h-3" />
                Locate Me
              </Button>

              {/* Stats */}
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
              
              {showCrowdAlerts && (
                <Card className="bg-orange-50 border-orange-200 shadow-none animate-in fade-in slide-in-from-right-4 duration-300">
                  <CardContent className="p-2 px-3 md:px-4 flex items-center gap-2 md:gap-3">
                    <Users className="w-4 h-4 text-orange-600" />
                    <div className="text-xs">
                      <span className="block font-bold text-sm md:text-base">{stats.crowdAlerts}</span>
                      <span className="text-muted-foreground hidden sm:inline">Alerts</span>
                      <span className="text-muted-foreground sm:hidden">A</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              
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
          </div>
        </header>

        {/* Main Content - Compact Layout */}
        <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-[1600px] mx-auto w-full">
          {/* Map Area - Explicit height for Leaflet to render properly */}
          <main className="flex-1 relative p-2 md:p-3 lg:p-4">
            {loading ? (
              <div className="h-[50vh] md:h-[60vh] lg:h-[600px] w-full flex flex-col items-center justify-center bg-muted/50 rounded-xl border gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">Loading safety data...</p>
              </div>
            ) : (
              <div className="h-[50vh] md:h-[60vh] lg:h-[600px] w-full rounded-xl overflow-hidden shadow-lg border bg-background">
                <CrimeMap 
                  mode="view" 
                  reports={verifiedReports} 
                  communityAlerts={showCrowdAlerts ? communityAlerts : []} 
                  center={mapCenter}
                  selectedReportId={selectedCardId || undefined}
                />
              </div>
            )}
          </main>

          {/* Sidebar - Compact with tabs */}
          <aside className="w-full lg:w-96 bg-background border-t lg:border-t-0 lg:border-l overflow-y-auto max-h-[45vh] lg:max-h-none shrink-0">
            <div className="p-3 md:p-4 space-y-4">
              {/* Tab Navigation */}
              <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
                <Button
                  variant={activeTab === "verified" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("verified")}
                  className={`flex-1 gap-2 text-xs ${activeTab === "verified" ? "" : "text-muted-foreground"}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified ({verifiedReports.length})
                </Button>
                <Button
                  variant={activeTab === "crowd" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("crowd")}
                  className={`flex-1 gap-2 text-xs ${activeTab === "crowd" ? "" : "text-muted-foreground"}`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Crowd ({communityAlerts.length})
                </Button>
              </div>

              {/* Verified Incidents */}
              {activeTab === "verified" && (
                <section className="space-y-2">
                  <h3 className="font-bold text-sm flex items-center gap-2 text-primary px-1">
                    <ShieldCheck className="w-4 h-4" />
                    Verified Incidents
                  </h3>
                  {verifiedReports.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-8 bg-muted/20 rounded-lg">
                      No verified reports yet. Check back later!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[35vh] lg:max-h-none overflow-y-auto pr-1 custom-scrollbar">
                      {verifiedReports.map((report) => {
                        const loc = report.location as { type: string; coordinates: [number, number] };
                        return (
                          <Card 
                            key={report.id} 
                            className={`border-l-4 transition-all cursor-pointer hover:shadow-md ${
                              selectedCardId === report.id 
                                ? "border-primary shadow-md ring-2 ring-primary/20" 
                                : report.riskLevel === "HIGH"
                                  ? "border-destructive hover:border-destructive/80"
                                  : report.riskLevel === "MEDIUM"
                                    ? "border-orange-400 hover:border-orange-500"
                                    : "border-green-400 hover:border-green-500"
                            }`}
                            onClick={() => handleCardClick("verified", report.id, loc.coordinates)}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-semibold text-sm truncate">{report.type}</span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] h-5 shrink-0 ${
                                    report.riskLevel === "HIGH" 
                                      ? "bg-destructive/10 text-destructive border-destructive/30" 
                                      : report.riskLevel === "MEDIUM"
                                        ? "bg-orange-50 text-orange-700 border-orange-200"
                                        : "bg-green-50 text-green-700 border-green-200"
                                  }`}
                                >
                                  {report.riskLevel}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {report.description}
                              </p>
                              <div className="flex justify-between items-center pt-1">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {new Date(report.createdAt).toLocaleDateString()}
                                </span>
                                <Badge variant="outline" className="bg-green-50/50 text-green-700 border-green-200 text-[10px] flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Verified ✓
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Community Warnings */}
              {activeTab === "crowd" && (
                <section className="space-y-2">
                  <h3 className="font-bold text-sm flex items-center gap-2 text-orange-600 px-1">
                    <AlertTriangle className="w-4 h-4" />
                    Community Warnings
                  </h3>
                  {communityAlerts.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-8 bg-muted/20 rounded-lg">
                      No community warnings at this time.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[35vh] lg:max-h-none overflow-y-auto pr-1 custom-scrollbar">
                      {communityAlerts.map((alert) => {
                        const loc = alert.location as { type: string; coordinates: [number, number] };
                        return (
                          <Card 
                            key={alert.id} 
                            className="border-l-4 border-orange-400 bg-orange-50/30 dark:bg-orange-950/10 cursor-pointer hover:border-orange-500 hover:shadow-md transition-all"
                            onClick={() => handleCardClick("crowd", alert.id, loc.coordinates)}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-semibold text-sm text-orange-700 dark:text-orange-400">{alert.type}</span>
                                <Badge variant="outline" className="text-[10px] bg-white/80 dark:bg-background/50 shrink-0">
                                  Unverified
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {alert.description}
                              </p>
                              <div className="flex justify-between items-center pt-1">
                                <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                  <Users className="w-3 h-3" /> {alert.reportCount} reports
                                </span>
                                <Badge variant="outline" className="bg-orange-50/50 text-orange-700 border-orange-200 text-[10px] flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Crowd-Sourced
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Legend */}
              <div className="p-3 rounded-lg bg-muted/30 text-xs space-y-2">
                <p className="font-semibold text-muted-foreground">Map Legend</p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-muted-foreground">Low Risk</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-orange-400"></span>
                    <span className="text-muted-foreground">Medium Risk</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-muted-foreground">High Risk</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-orange-600 animate-pulse"></span>
                    <span className="text-muted-foreground">Community Alert</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="border-t py-3 px-4 bg-background/80 backdrop-blur-sm">
          <p className="text-[10px] text-muted-foreground text-center max-w-[1600px] mx-auto">
            Disclaimer: This is a tool for awareness. Always contact emergency services for active crises. 
            Community-sourced data is unverified and should be treated with caution.
          </p>
        </footer>
      </div>
    </PageTransition>
  );
}
