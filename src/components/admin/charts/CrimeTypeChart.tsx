"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CrimeTypeDataPoint {
  name: string;
  value: number;
}

export default function CrimeTypeChart() {
  const [data, setData] = useState<CrimeTypeDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCrimeTypeData() {
      try {
        const res = await fetch("/api/admin/reports?limit=1000");
        const result = await res.json();

        if (result.reports) {
          const typeCounts: Record<string, number> = {};
          
          result.reports.forEach((report: any) => {
            typeCounts[report.type] = (typeCounts[report.type] || 0) + 1;
          });

          // Sort by count descending and take top 10
          const chartData: CrimeTypeDataPoint[] = Object.entries(typeCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

          setData(chartData);
        }
      } catch (error) {
        console.error("Failed to fetch crime type data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCrimeTypeData();
  }, []);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Top Crime Types</CardTitle>
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
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="name" type="category" width={120} className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * (240 / Math.max(data.length, 1))}, 70%, 50%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Crime Type Bars */}
        {data.length > 0 && (
          <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {data.map((item, index) => (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium truncate">{item.name}</span>
                  <span className="text-muted-foreground ml-2 shrink-0">
                    {item.value} ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: `hsl(${index * (240 / Math.max(data.length, 1))}, 70%, 50%)`,
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
