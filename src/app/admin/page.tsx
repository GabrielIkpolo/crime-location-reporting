"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { PageTransition } from "@/components/ui/PageTransition";

const AdminHeatmap = dynamic(() => import("@/components/Map/AdminHeatmap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-muted">Loading Analytics...</div>
});

export default function AdminPage() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch("/api/admin/reports");
        const data = await res.json();
        if (Array.isArray(data)) {
          setReports(data);
        } else {
          console.error("Expected array of reports, got:", data);
        }
      } catch (err) {
        console.error("Failed to fetch reports", err);
      }
    }
    fetchReports();
  }, []);

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Command Center</h1>
            <p className="text-muted-foreground">Real-time overview of crime reports and hotspots.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Reports" value={(reports?.length || 0).toString()} trend="+12%" color="blue" />
            <StatCard title="Pending Verification" value={(reports?.filter((r:any) => r.status === "PENDING").length || 0).toString()} trend="Urgent" color="amber" />
            <StatCard title="Verified Incidents" value={(reports?.filter((r:any) => r.status === "VERIFIED").length || 0).toString()} trend="+5%" color="green" />
            <StatCard title="High Risk Reports" value={(reports?.filter((r:any) => r.riskLevel === "HIGH").length || 0).toString()} trend="Critical" color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[500px] bg-muted rounded-xl border overflow-hidden shadow-inner">
              <AdminHeatmap reports={reports} />
            </div>
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="font-semibold text-lg">Recent Activity</h3>
              <div className="space-y-4">
                {reports.slice(0, 5).map((report: any, i) => (
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
                    </div>
                  </div>
                ))}
                {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports available.</p>}
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </AdminLayout>
  );
}

function StatCard({ title, value, trend, color }: { title: string, value: string, trend: string, color: string }) {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    green: "text-green-600 bg-green-50 border-green-100",
    red: "text-red-600 bg-red-50 border-red-100",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="flex items-end justify-between mt-2">
          <h2 className="text-3xl font-bold">{value}</h2>
          <span className={cn("text-xs font-medium px-2 py-1 rounded-full border", colorClasses[color as keyof typeof colorClasses])}>
            {trend}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
