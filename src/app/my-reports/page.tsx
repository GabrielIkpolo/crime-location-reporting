"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { PageTransition } from "@/components/ui/PageTransition";

interface Report {
  id: string;
  type: string;
  description: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "CROWD_REPORTED";
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  createdAt: Date;
}

export default function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const itemsPerPage = 10;

  useEffect(() => {
    fetchMyReports();
  }, [currentPage, statusFilter]);

  async function fetchMyReports() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
      });

      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/reports/me?${params}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      
      const data = await res.json();
      
      if (data && Array.isArray(data.reports)) {
        setReports(data.reports);
        setTotalPages(data.totalPages);
        setTotalReports(data.total);
      } else {
        console.error("Expected object with reports array, got:", data);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: Report["status"]) => {
    switch (status) {
      case "VERIFIED":
        return <Badge className="bg-green-500 text-white flex gap-1"><CheckCircle className="w-3 h-3" /> Verified</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="flex gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="flex gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
    }
  };

  const getStatusColor = (status: Report["status"]) => {
    switch (status) {
      case "VERIFIED": return "text-green-600";
      case "REJECTED": return "text-red-600";
      default: return "text-amber-600";
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto p-4 py-8 max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Incident Reports</h1>
          <p className="text-muted-foreground">Track the verification status of your submissions.</p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{totalReports}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{reports.filter(r => r.status === "PENDING").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Verified</p>
              <p className="text-2xl font-bold text-green-600">{reports.filter(r => r.status === "VERIFIED").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{reports.filter(r => r.status === "REJECTED").length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter by status:</span>
          <Select value={statusFilter} onValueChange={(val) => { if (val) { setStatusFilter(val); setCurrentPage(1); } }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reports Table */}
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
                      <p>You haven&apos;t submitted any reports yet.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.type}</TableCell>
                      <TableCell>{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${getStatusColor(report.status)}`}>
                          {getStatusBadge(report.status)}
                        </span>
                      </TableCell>
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

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {reports.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
            {Math.min(currentPage * itemsPerPage, totalReports)} of {totalReports} reports
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || loading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
