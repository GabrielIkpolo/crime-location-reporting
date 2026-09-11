"use client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminLog } from "@/types";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const itemsPerPage = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
      });

      const res = await fetch(`/api/admin/logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      
      const data = await res.json();
      
      if (data && Array.isArray(data.logs)) {
        setLogs(data.logs);
        setTotalPages(data.totalPages || 1);
        setTotalLogs(data.total || 0);
      } else {
        console.error("Expected object with logs array, got:", data);
      }
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Audit Logs</h1>
        <p className="text-muted-foreground">Trace all admin actions and report modifications.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Total Logs</p>
          <p className="text-2xl font-bold">{totalLogs}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Showing Page {currentPage} of {totalPages}</p>
          <p className="text-2xl font-bold">{logs.length} entries</p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target (ID/Type)</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading logs...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  No logs available.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.admin ? (log.admin.name || log.admin.email || "Unknown Admin") : "System"}
                  </TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.reportId ? `Report: ${log.reportId}` : "System/User Action"}
                  </TableCell>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          Showing {logs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
          {Math.min(currentPage * itemsPerPage, totalLogs)} of {totalLogs} logs
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
  );
}
