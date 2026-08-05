"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Report } from "@/types";

const AdminHeatmap = dynamic(() => import("@/components/Map/AdminHeatmap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-muted">Loading Analytics...</div>
});

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<"all" | "PENDING" | "VERIFIED" | "HIGH">("all");

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch("/api/admin/reports");
        const data = await res.json();
        if (data && Array.isArray(data.reports)) {
          setReports(data.reports);
        } else {
          console.error("Expected object with reports array, got:", data);
        }
      } catch (err) {
        console.error("Failed to fetch reports", err);
      }
    }
    fetchReports();
  }, []);

  const filteredReports = reports.filter((r) => {
    if (filter === "all") return true;
    if (filter === "HIGH") return r.riskLevel === "HIGH";
    return r.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Command Center</h1>
          <p className="text-muted-foreground">Real-time overview of crime reports and hotspots.</p>
        </div>
        {filter !== "all" && (
          <Button variant="outline" size="sm" onClick={() => setFilter("all")}>
            Clear Filter
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Reports" value={(reports?.length || 0).toString()} trend="+12%" color="blue" onClick={() => setFilter("all")} />
        <StatCard title="Pending Verification" value={(reports?.filter((r) => r.status === "PENDING").length || 0).toString()} trend="Urgent" color="amber" onClick={() => setFilter("PENDING")} />
        <StatCard title="Verified Incidents" value={(reports?.filter((r) => r.status === "VERIFIED").length || 0).toString()} trend="+5%" color="green" onClick={() => setFilter("VERIFIED")} />
        <StatCard title="High Risk Reports" value={(reports?.filter((r) => r.riskLevel === "HIGH").length || 0).toString()} trend="Critical" color="red" onClick={() => setFilter("HIGH")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[500px] bg-muted rounded-xl border overflow-hidden shadow-inner relative p-4">
          <div className="absolute top-8 left-8 z-[1000] bg-background/80 backdrop-blur px-3 py-1 rounded-full border text-xs font-medium shadow-sm">
            {filter === 'all' ? 'Showing All Reports' : `Filter: ${filter}`}
          </div>
          <AdminHeatmap reports={filteredReports} />
        </div>
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-lg">Recent Activity</h3>
          <div className="space-y-4">
            {reports.slice(0, 5).map((report, i) => (
              <div key={i} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1.5",
                  report.riskLevel === "HIGH" ? "bg-red-500" : report.riskLevel === "MEDIUM" ? "bg-amber-500" : "bg-green-500"
                )} />
                <div>
                  <p className="font-medium">{report.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(report.createdAt).toLocaleDateString()} • {report.status}
                  </p>
                </div >
              </div >
            ))}
            {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports available.</p>}
          </div >
        </div >
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  trend, 
  color, 
  onClick 
}: { 
  title: string, 
  value: string, 
  trend: string, 
  color: string,
  onClick?: () => void 
}) {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    green: "text-green-600 bg-green-50 border-green-100",
    red: "text-red-600 bg-red-50 border-red-100",
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer hover:scale-[1.02]",
        !onClick && "cursor-default"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="flex items-end justify-between mt-2">
          <h2 className="text-3xl font-bold">{value}</h2>
          <span className={cn("text-xs font-medium px-2 py-1 rounded-full border", colorClasses[color as keyof typeof colorClasses])}>
            {trend}
          </span >
        </div >
      </CardContent>
    </Card>
  );
}
