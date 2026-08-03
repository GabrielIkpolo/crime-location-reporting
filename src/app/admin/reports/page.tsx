"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Loader2, Check, X, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ReportDetailsDialog } from "@/components/admin/ReportDetailsDialog";

export default function ReportsQueuePage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/reports?page=${currentPage}&limit=${itemsPerPage}`);
        const data = await res.json();
        if (data && Array.isArray(data.reports)) {
          setReports(data.reports);
          setTotalPages(data.totalPages);
        } else {
          console.error("Expected object with reports array, got:", data);
        }
      } catch (err) {
        console.error("Failed to fetch reports", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [currentPage]);

  async function updateStatus(id: string, status: string, riskLevel: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, riskLevel }),
      });

      if (!res.ok) throw new Error("Update failed");
      
      // Optimistic update
      setReports(prev => prev.map(r => r.id === id ? { ...r, status, riskLevel } : r));
      toast.success("Report updated successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Verification Queue</h1>
          <p className="text-muted-foreground">Review and validate incoming crime reports.</p>
        </div >
      </div >

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Crime Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading reports...
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No reports found.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report: any) => (
                  <TableRow key={report.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(report.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{report.type}</TableCell>
                    <TableCell className="max-w-xs truncate">{report.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {report.location.coordinates[1].toFixed(4)}, {report.location.coordinates[0].toFixed(4)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.status === "VERIFIED" ? "default" : "secondary"}>
                        {report.status}
                      </Badge>
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
                    <TableCell className="text-right space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewReport(report)}
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 w-8 p-0"
                        onClick={() => updateStatus(report.id, "VERIFIED", report.riskLevel)}
                        disabled={updatingId === report.id}
                      >
                        {updatingId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-600" />}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 w-8 p-0"
                        onClick={() => updateStatus(report.id, "REJECTED", report.riskLevel)}
                        disabled={updatingId === report.id}
                      >
                        {updatingId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 text-destructive" />}
                      </Button>
                      <Select 
                        defaultValue={report.riskLevel} 
                        onValueChange={(val) => updateStatus(report.id, report.status, val)}
                      >
                        <SelectTrigger className="w-[110px] h-8">
                          <SelectValue placeholder="Risk" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                        </SelectContent>
                      </Select>
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
          Showing page {currentPage} of {totalPages}
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

      <ReportDetailsDialog 
        report={selectedReport} 
        isOpen={isDialogOpen} 
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedReport(null);
        }}
      />
    </div >
  );
}
