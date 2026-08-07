"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  RefreshCw,
  Loader2,
  Clock,
  MapPin,
  ChevronRight,
  Filter,
} from "lucide-react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  HOTSPOT_ALERT: {
    icon: <AlertTriangle className="w-5 h-5" />,
    color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    label: "Hotspot Alert",
  },
  REPORT_STATUS_CHANGE: {
    icon: <RefreshCw className="w-5 h-5" />,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    label: "Status Update",
  },
  COMMUNITY_WARNING: {
    icon: <ShieldAlert className="w-5 h-5" />,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    label: "Community Warning",
  },
  SOS_RESPONSE: {
    icon: <BellOff className="w-5 h-5" />,
    color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
    label: "SOS Response",
  },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data: NotificationItem[] = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications =
    filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  const markAsRead = async (notificationId: string): Promise<void> => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async (): Promise<void> => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (notificationId: string): Promise<void> => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success("Notification removed");
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: diffDays > 30 ? "numeric" : undefined,
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const groupedByDate = filteredNotifications.reduce<Record<string, NotificationItem[]>>((acc, notification) => {
    const date = new Date(notification.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(notification);
    return acc;
  }, {});

  return (
    <PageTransition>
      <div className="container mx-auto p-4 py-12 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Bell className="w-7 h-7 text-primary" />
              Notifications
            </h1>
            <p className="text-muted-foreground mt-1">
              Stay informed about crime activity in your area
              {unreadCount > 0 && (
                <span className="text-destructive font-semibold ml-1">
                  ({unreadCount} unread)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setRefreshing(true);
                fetchNotifications();
              }}
              className="h-9 w-9"
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b pb-2">
          <Filter className="w-4 h-4 text-muted-foreground mr-2" />
          <Button
            variant={filter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="gap-2"
          >
            All
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {notifications.length}
            </Badge>
          </Button>
          <Button
            variant={filter === "unread" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("unread")}
            className="gap-2"
          >
            Unread
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {unreadCount}
            </Badge>
          </Button>
        </div>

        {/* Notifications List */}
        <Card className="border shadow-sm">
          {loading ? (
            <CardContent className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Loading notifications...</p>
            </CardContent>
          ) : filteredNotifications.length === 0 ? (
            <CardContent className="p-12 flex flex-col items-center justify-center gap-3">
              <BellOff className="w-12 h-12 text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm text-center">
                {filter === "unread"
                  ? "No unread notifications"
                  : "No notifications yet"}
              </p>
              <Link href="/settings">
                <Button variant="link" size="sm" className="text-xs">
                  Go to Settings → Notification Preferences
                </Button>
              </Link>
            </CardContent>
          ) : (
            <div className="divide-y">
              {Object.entries(groupedByDate).map(([date, items]) => (
                <React.Fragment key={date}>
                  {/* Date Header */}
                  <div className="px-4 py-2 bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {date}
                      </span>
                    </div>
                  </div>

                  {/* Notifications */}
                  {items.map((notification) => {
                    const config = TYPE_CONFIG[notification.type] || {
                      icon: <Bell className="w-5 h-5" />,
                      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
                      label: notification.type,
                    };

                    return (
                      <div
                        key={notification.id}
                        className={`group relative transition-colors ${
                          !notification.isRead
                            ? "bg-primary/5 dark:bg-primary/10"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        {!notification.isRead && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l" />
                        )}
                        <div className="flex items-start gap-3 p-4">
                          {/* Icon */}
                          <div
                            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}
                          >
                            {config.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold truncate">
                                    {notification.title}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-normal h-4 px-1.5"
                                  >
                                    {config.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                  {formatDate(notification.createdAt)}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notification.isRead && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => markAsRead(notification.id)}
                                    title="Mark as read"
                                  >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => deleteNotification(notification.id)}
                                  title="Delete"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Metadata (location) */}
                            {notification.metadata &&
                              typeof notification.metadata === "object" &&
                              "location" in notification.metadata && (
                                <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  <span>
                                    {typeof notification.metadata.location === "object" &&
                                    notification.metadata.location !== null
                                      ? `${(notification.metadata.location as { lat?: number; lng?: number }).lat?.toFixed(4)}, ${(notification.metadata.location as { lat?: number; lng?: number }).lng?.toFixed(4)}`
                                      : "Location data"}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Click to mark as read */}
                        {!notification.isRead && (
                          <button
                            className="absolute inset-0 z-0"
                            onClick={() => markAsRead(notification.id)}
                            aria-label="Mark as read"
                          />
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {filteredNotifications.length} of {notifications.length} notifications
              </p>
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  Notification Preferences
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  );
}
