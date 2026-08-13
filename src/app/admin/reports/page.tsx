"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Loader2, Check, X, Eye, ChevronLeft, ChevronRight, Download, Trash2, FileCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ReportDetailsDialog } from "@/components/admin/ReportDetailsDialog";
import { Report } from "@/types";

export default function ReportsQueuePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState<{ action: "approve" | "reject"; riskLevel?: string } | null>(null);

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

  async function updateStatus(id: string, status: Report["status"], riskLevel: Report["riskLevel"]) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, riskLevel }),
      });

      if (!res.ok) throw new Error("Update failed");
      
      // Optimistic update
      setReports(prev => prev.map(r => r.id === id ? { ...r, status, riskLevel } : r) as Report[]);
      toast.success("Report updated successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Update failed";
      toast.error(message);
    } finally {
      setUpdatingId(null);
    }
  }

  // Bulk selection handlers
  const toggleSelectReport = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map(r => r.id)));
    }
  };

  const isAllSelected = reports.length > 0 && selectedIds.size === reports.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < reports.length;

  // Bulk action handlers
  const handleBulkAction = async (action: "approve" | "reject", riskLevel?: string) => {
    setBulkActionLoading(true);
    setShowBulkConfirm(null);

    try {
      const res = await fetch("/api/admin/reports/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportIds: Array.from(selectedIds),
          action,
          riskLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Bulk operation failed");

      // Remove selected reports from the list and show success
      setReports(prev => prev.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      
      toast.success(
        action === "approve" 
          ? `Successfully approved ${data.updatedCount} report(s)`
          : `Successfully rejected ${data.updatedCount} report(s)`
      );

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Bulk operation failed";
      toast.error(message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Export handler
  const handleExportCSV = () => {
    const url = `/api/admin/export?format=csv&page=${currentPage}&limit=${itemsPerPage}`;
    window.open(url, "_blank");
    toast.success("Export started — CSV file will download shortly");
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Verification Queue</h1>
          <p className="text-muted-foreground">Review and validate incoming crime reports.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExportCSV}
          disabled={loading || reports.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Bulk Action Confirmation Dialog */}
      {showBulkConfirm && (
        <Card className="border-destructive/50">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Confirm Bulk Action</h3>
            </div>
            <p className="text-muted-foreground">
              Are you sure you want to {showBulkConfirm.action}{" "}
              <strong>{selectedIds.size}</strong>{" "}
              selected report{selectedIds.size !== 1 ? "s" : ""}?
              {showBulkConfirm.riskLevel && (
                <span> This will also set their risk level to <strong>{showBulkConfirm.riskLevel}</strong>.</span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowBulkConfirm(null)}
                disabled={bulkActionLoading}
              >
                Cancel
              </Button>
              <Button 
                variant={showBulkConfirm.action === "approve" ? "default" : "destructive"}
                onClick={() => handleBulkAction(showBulkConfirm.action, showBulkConfirm.riskLevel)}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {showBulkConfirm.action === "approve" ? (
                  <>
                    <FileCheck className="w-4 h-4 mr-2" />
                    Approve All Selected
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reject All Selected
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && !showBulkConfirm && (
        <Card className="border-primary/50 shadow-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm">
                {selectedIds.size} report{selectedIds.size !== 1 ? "s" : ""} selected
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Select onValueChange={(value: string | null) => setShowBulkConfirm({ action: "approve", riskLevel: value || undefined })}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Set Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Change</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                variant="default"
                onClick={() => setShowBulkConfirm({ action: "approve", riskLevel: undefined })}
              >
                <FileCheck className="w-4 h-4 mr-2" />
                Approve Selected
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => setShowBulkConfirm({ action: "reject", riskLevel: undefined })}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Reject Selected
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </TableHead>
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
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading reports...
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No reports found.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id} className={selectedIds.has(report.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(report.id)}
                        onChange={() => toggleSelectReport(report.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </TableCell>
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
                        onValueChange={(val) => updateStatus(report.id, report.status, val as Report["riskLevel"])}
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
    </div>
  );
}
