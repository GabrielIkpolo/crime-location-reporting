"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";

/**
 * Report Trends Chart — Line chart showing reports over time.
 * 
 * NOTE: This component is a placeholder structure for Recharts integration.
 * When you install recharts (pnpm add recharts), replace the placeholder UI below
 * with actual Recharts components.
 * 
 * Installation when internet allows:
 *   pnpm add recharts
 * 
 * Then update this file to use:
 *   import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Cell } from 'recharts';

interface TrendDataPoint {
  date: string;
  total: number;
  verified: number;
  pending: number;
}

export default function ReportTrendsChart() {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrendData() {
      try {
        // Fetch last 30 days of report data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        const res = await fetch(
          `/api/admin/reports?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=1000`
        );
        const result = await res.json();

        if (result.reports) {
          // Group reports by date
          const grouped: Record<string, TrendDataPoint> = {};
          
          result.reports.forEach((report: any) => {
            const date = new Date(report.createdAt).toISOString().split("T")[0];
            if (!grouped[date]) {
              grouped[date] = { date, total: 0, verified: 0, pending: 0 };
            }
            grouped[date].total++;
            if (report.status === "VERIFIED") grouped[date].verified++;
            else if (report.status === "PENDING") grouped[date].pending++;
          });

          setData(Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)));
        }
      } catch (error) {
        console.error("Failed to fetch trend data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrendData();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Report Trends (Last 30 Days)</CardTitle>
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
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth()+1}/${d.getDate()}`;
                }}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                labelFormatter={(label) => {
                  if (!label) return '';
                  const d = new Date(Number(label));
                  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Total Reports"
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="verified" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Verified"
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="pending" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Pending"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Summary Stats */}
        {data.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Reports</p>
              <p className="text-xl font-bold">{data.reduce((sum, d) => sum + d.total, 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <p className="text-xs text-muted-foreground">Verified</p>
              <p className="text-xl font-bold text-green-600">{data.reduce((sum, d) => sum + d.verified, 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-amber-600">{data.reduce((sum, d) => sum + d.pending, 0)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
