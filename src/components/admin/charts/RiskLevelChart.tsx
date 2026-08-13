"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useState, useEffect } from "react";

/**
 * Risk Level Chart — Bar chart showing risk level distribution.
 * 
 * NOTE: Placeholder for Recharts integration (see ReportTrendsChart.tsx for details).
 */

interface RiskDataPoint {
  name: string;
  value: number;
  color: string;
}

export default function RiskLevelChart() {
  const [data, setData] = useState<RiskDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRiskData() {
      try {
        const res = await fetch("/api/admin/reports?limit=1000");
        const result = await res.json();

        if (result.reports) {
          const riskCounts: Record<string, number> = {};
          
          result.reports.forEach((report: any) => {
            riskCounts[report.riskLevel] = (riskCounts[report.riskLevel] || 0) + 1;
          });

          const colors: Record<string, string> = {
            LOW: "#22c55e",
            MEDIUM: "#f59e0b",
            HIGH: "#ef4444",
          };

          const chartData: RiskDataPoint[] = Object.entries(riskCounts)
            .map(([name, value]) => ({
              name,
              value,
              color: colors[name] || "#8884d8",
            }))
            .sort((a, b) => {
              const order = ["HIGH", "MEDIUM", "LOW"];
              return order.indexOf(a.name) - order.indexOf(b.name);
            });

          setData(chartData);
        }
      } catch (error) {
        console.error("Failed to fetch risk data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRiskData();
  }, []);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Risk Level Distribution</CardTitle>
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Risk Level Bars */}
        {data.length > 0 && (
          <div className="mt-4 space-y-3">
            {data.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">
                    {item.value} ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
