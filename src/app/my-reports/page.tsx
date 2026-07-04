"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { PageTransition } from "@/components/ui/PageTransition";

export default function MyReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyReports() {
      try {
        const res = await fetch("/api/reports/me");
        if (!res.ok) throw new Error("Failed to fetch reports");
        const data = await res.json();
        setReports(data);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMyReports();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <Badge className="bg-green-500 text-white flex gap-1"><CheckCircle className="w-3 h-3" /> Verified</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="flex gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="flex gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto p-4 py-8 max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Incident Reports</h1>
          <p className="text-muted-foreground">Track the verification status of your submissions.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crime Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-muted-foreground">Fetching your reports...</p>
                    </TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>You haven't submitted any reports yet.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report: any) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.type}</TableCell>
                      <TableCell>{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          report.riskLevel === "HIGH" ? "text-red-600 border-red-200 bg-red-50" :
                          report.riskLevel === "MEDIUM" ? "text-amber-600 border-amber-200 bg-amber-50" :
                          "text-green-600 border-green-200 bg-green-50"
                        }>
                          {report.riskLevel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
