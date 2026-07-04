"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("/api/admin/logs");
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        console.error("Failed to fetch logs", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Audit Logs</h1>
          <p className="text-muted-foreground">Trace all admin actions and report modifications.</p>
        </div>

        <div className="bg-card rounded-xl border p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Report ID</TableHead>
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
                logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.admin.name || log.admin.email}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell className="font-mono text-xs">{log.reportId}</TableCell>
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
