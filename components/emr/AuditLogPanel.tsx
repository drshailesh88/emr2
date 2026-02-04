"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Filter,
  Activity,
  Clock,
  User,
  Shield,
  Bot,
  FileText,
} from "lucide-react";

interface AuditLogPanelProps {
  doctor: Doc<"doctors"> | null;
}

// Action type to icon mapping
const actionIcons: Record<string, typeof Activity> = {
  message_received: Activity,
  emergency_detected: Shield,
  draft_response_generated: Bot,
  message_approved: User,
  message_rejected: User,
  appointment_requested: Clock,
  prescription_created: FileText,
};

// Action type to color mapping
const actionColors: Record<string, string> = {
  emergency_detected: "text-red-600 bg-red-50",
  message_approved: "text-green-600 bg-green-50",
  message_rejected: "text-orange-600 bg-orange-50",
  default: "text-blue-600 bg-blue-50",
};

export function AuditLogPanel({ doctor }: AuditLogPanelProps) {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("week");

  // Calculate date range
  const dateRangeMs = useMemo(() => {
    const now = Date.now();
    switch (dateRange) {
      case "today":
        return { start: now - 24 * 60 * 60 * 1000, end: now };
      case "week":
        return { start: now - 7 * 24 * 60 * 60 * 1000, end: now };
      case "month":
        return { start: now - 30 * 24 * 60 * 60 * 1000, end: now };
      default:
        return { start: undefined, end: undefined };
    }
  }, [dateRange]);

  // Fetch audit logs
  const auditLogs = useQuery(
    api.auditLog.getByDoctor,
    doctor
      ? {
          doctorId: doctor._id,
          limit: 200,
          actionFilter: actionFilter === "all" ? undefined : actionFilter,
          startDate: dateRangeMs.start,
          endDate: dateRangeMs.end,
        }
      : "skip"
  );

  // Fetch action types for filter
  const actionTypes = useQuery(
    api.auditLog.getActionTypes,
    doctor ? { doctorId: doctor._id } : "skip"
  );

  // Fetch stats
  const stats = useQuery(
    api.auditLog.getStats,
    doctor ? { doctorId: doctor._id, days: 7 } : "skip"
  );

  // Filter logs by search query
  const filteredLogs = useMemo(() => {
    if (!auditLogs) return [];
    if (!searchQuery) return auditLogs;

    const query = searchQuery.toLowerCase();
    return auditLogs.filter(
      (log) =>
        log.action.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query) ||
        log.performedBy.toLowerCase().includes(query)
    );
  }, [auditLogs, searchQuery]);

  // Export logs as CSV
  const handleExport = () => {
    if (!filteredLogs.length) return;

    const headers = ["Timestamp", "Action", "Details", "Performed By"];
    const rows = filteredLogs.map((log) => [
      new Date(log.timestamp).toISOString(),
      log.action,
      `"${log.details.replace(/"/g, '""')}"`,
      log.performedBy,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) {
      return `Today ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-IN", { weekday: "short", hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    }
  };

  // Get icon for action
  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action] || Activity;
    return Icon;
  };

  // Get color for action
  const getActionColor = (action: string) => {
    return actionColors[action] || actionColors.default;
  };

  if (!doctor) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="audit-log-panel">
      {/* Header with stats */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Audit Log</h2>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!filteredLogs.length}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Total Actions</div>
              <div className="text-xl font-bold">{stats.total}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Last 7 Days</div>
              <div className="text-xl font-bold">{stats.recent}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">By System</div>
              <div className="text-xl font-bold">{stats.byPerformer["system"] || 0}</div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">Search</Label>
            <Input
              placeholder="Search actions, details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="w-40">
            <Label className="text-xs">Action Type</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes?.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Label className="text-xs">Date Range</Label>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Log entries */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {auditLogs === undefined ? "Loading..." : "No audit log entries found"}
            </div>
          ) : (
            filteredLogs.map((log) => {
              const Icon = getActionIcon(log.action);
              const colorClass = getActionColor(log.action);

              return (
                <div
                  key={log._id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  data-testid="audit-log-entry"
                >
                  <div className={`p-2 rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        by {log.performedBy}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {log.details}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
