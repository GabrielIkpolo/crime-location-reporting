"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, MailOpen, Mail, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRead, setFilterRead] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchMessages();
  }, [currentPage, searchQuery, filterRead]);

  async function fetchMessages() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
      });

      if (searchQuery) params.set("search", searchQuery);
      if (filterRead !== "all") params.set("isRead", filterRead === "unread" ? "false" : "true");

      const res = await fetch(`/api/admin/messages?${params}`);
      const data = await res.json();

      if (data && Array.isArray(data.messages)) {
        setMessages(data.messages);
        setTotalPages(data.totalPages);
        setTotalMessages(data.total);
      } else {
        console.error("Expected object with messages array, got:", data);
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleReadStatus(messageId: string, currentIsRead: boolean) {
    try {
      const res = await fetch(`/api/admin/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !currentIsRead }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      setMessages(prev =>
        prev.map((m) => m.id === messageId ? { ...m, isRead: !currentIsRead } : m)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update";
      toast.error(message);
    }
  }

  async function deleteMessage(messageId: string) {
    if (!confirm("Are you sure you want to delete this message? This action cannot be undone.")) return;

    setDeletingId(messageId);
    try {
      const res = await fetch(`/api/admin/messages/${messageId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      setMessages(prev => prev.filter((m) => m.id !== messageId));
      toast.success("Message deleted successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">View and manage contact form submissions.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Total Messages</p>
          <p className="text-2xl font-bold">{totalMessages}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Unread</p>
          <p className="text-2xl font-bold text-destructive">
            {messages.filter(m => !m.isRead).length}
          </p>
        </div>
        <div className="bg-card rounded-xl border p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Read</p>
          <p className="text-2xl font-bold text-green-600">
            {messages.filter(m => m.isRead).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="max-w-sm"
          />
          <Select value={filterRead} onValueChange={(val) => { if (val) { setFilterRead(val); setCurrentPage(1); } }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Messages</SelectItem>
              <SelectItem value="unread">Unread Only</SelectItem>
              <SelectItem value="read">Read Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading messages...
                </TableCell>
              </TableRow>
            ) : messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  No messages found.
                </TableCell>
              </TableRow>
            ) : (
              messages.map((msg) => (
                <TableRow key={msg.id} className={msg.isRead ? "" : "bg-muted/30"}>
                  <TableCell>
                    {msg.isRead ? (
                      <MailOpen className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">NEW</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{msg.name}</TableCell>
                  <TableCell>{msg.email}</TableCell>
                  <TableCell className="max-w-xs truncate">{msg.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleDateString()}{" "}
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedMessage(msg)}
                        title="View message"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleReadStatus(msg.id, msg.isRead)}
                        title={msg.isRead ? "Mark as unread" : "Mark as read"}
                      >
                        {msg.isRead ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deletingId === msg.id}
                        onClick={() => deleteMessage(msg.id)}
                        title="Delete message"
                      >
                        {deletingId === msg.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          Showing {messages.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
          {Math.min(currentPage * itemsPerPage, totalMessages)} of {totalMessages} messages
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

      {/* Message Detail Dialog */}
      {selectedMessage && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl max-w-lg w-full shadow-2xl border overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">{selectedMessage.subject}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    From: {selectedMessage.name} ({selectedMessage.email})
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedMessage(null)}>
                  ✕
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Received: {new Date(selectedMessage.createdAt).toLocaleString()}</span>
                <Badge variant={selectedMessage.isRead ? "secondary" : "destructive"}>
                  {selectedMessage.isRead ? "Read" : "Unread"}
                </Badge>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={() => toggleReadStatus(selectedMessage.id, selectedMessage.isRead)}>
                  {selectedMessage.isRead ? "Mark as Unread" : "Mark as Read"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
