"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";

/**
 * Status Distribution Chart — Donut/pie chart showing report status breakdown.
 * 
 * NOTE: Placeholder for Recharts integration (see ReportTrendsChart.tsx for details).
 */

interface StatusDataPoint {
  name: string;
  value: number;
  color: string;
}

export default function StatusDistributionChart() {
  const [data, setData] = useState<StatusDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatusData() {
      try {
        const res = await fetch("/api/admin/reports?limit=1000");
        const result = await res.json();

        if (result.reports) {
          const statusCounts: Record<string, number> = {};
          
          result.reports.forEach((report: any) => {
            statusCounts[report.status] = (statusCounts[report.status] || 0) + 1;
          });

          const colors: Record<string, string> = {
            PENDING: "#f59e0b",
            VERIFIED: "#22c55e",
            REJECTED: "#ef4444",
            CROWD_REPORTED: "#3b82f6",
          };

          const chartData: StatusDataPoint[] = Object.entries(statusCounts)
            .map(([name, value]) => ({
              name,
              value,
              color: colors[name] || "#8884d8",
            }))
            .sort((a, b) => b.value - a.value);

          setData(chartData);
        }
      } catch (error) {
        console.error("Failed to fetch status data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStatusData();
  }, []);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Report Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">No report data available</div>
          </div>
        ) : (
          /* 
           * TODO: Replace this placeholder with Recharts when installed.
           * 
           * Example implementation:
           * 
           * <ResponsiveContainer width="100%" height={300}>
           *   <PieChart>
           *     <Pie
           *       data={data}
           *       cx="50%"
           *       cy="50%"
           *       labelLine={false}
           *       label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
           *       outerRadius={80}
           *       fill="#8884d8"
           *       dataKey="value"
           *     >
           *       {data.map((entry, index) => (
           *         <Cell key={`cell-${index}`} fill={entry.color} />
           *       ))}
           *     </Pie>
           *     <Tooltip />
           *   </PieChart>
           * </ResponsiveContainer>
           */
          <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg p-4">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-muted-foreground">🍩 Chart Placeholder</p>
              <p className="text-xs text-muted-foreground">Install recharts to enable this chart</p>
            </div>
          </div>
        )}

        {/* Legend */}
        {data.length > 0 && (
          <div className="mt-4 space-y-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.value}</span>
                  <span className="text-muted-foreground text-xs">
                    ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
