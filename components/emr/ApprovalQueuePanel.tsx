"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Check,
  X,
  Edit,
  MessageSquare,
  Clock,
  User,
  CheckCheck,
  History,
  BarChart3,
} from "lucide-react";

interface ApprovalQueuePanelProps {
  doctorId: Id<"doctors"> | null;
  onViewConversation?: (conversationId: Id<"conversations">) => void;
}

export function ApprovalQueuePanel({
  doctorId,
  onViewConversation,
}: ApprovalQueuePanelProps) {
  const pendingMessages = useQuery(
    api.messageIntake.getPendingApprovalMessages,
    doctorId ? { doctorId } : "skip"
  );

  // Approval history - get recent approved/rejected messages
  const approvalHistory = useQuery(
    api.messageIntake.getApprovalHistory,
    doctorId ? { doctorId, limit: 50 } : "skip"
  );

  const approveMessage = useMutation(api.messageIntake.approveMessage);
  const rejectMessage = useMutation(api.messageIntake.rejectMessage);

  // UI state
  const [activeTab, setActiveTab] = useState<"pending" | "history" | "stats">("pending");

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<{
    _id: Id<"messages">;
    content: string;
    patient: { name: string; phone: string } | null;
  } | null>(null);
  const [draftResponse, setDraftResponse] = useState("");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<Id<"messages">>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!approvalHistory) return null;

    const validHistory = approvalHistory.filter((m): m is NonNullable<typeof m> => m !== null);
    const total = validHistory.length;
    const approved = validHistory.filter((m) => m.approved === true).length;
    const rejected = validHistory.filter((m) => m.approved === false).length;

    // Calculate by category
    const byCategory: Record<string, number> = {};
    for (const msg of validHistory) {
      const cat = msg.triageCategory || "admin";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    // Calculate average response time (time from message to approval)
    const responseTimes = validHistory
      .filter((m) => m.approvedAt && m.timestamp)
      .map((m) => (m.approvedAt! - m.timestamp) / 1000 / 60); // in minutes

    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    return {
      total,
      approved,
      rejected,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      byCategory,
      avgResponseTime,
    };
  }, [approvalHistory]);

  // Toggle selection
  const toggleSelection = (id: Id<"messages">) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Select all
  const selectAll = () => {
    if (!pendingMessages) return;
    const allIds = new Set(pendingMessages.filter(m => m).map((m) => m!._id));
    setSelectedIds(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkApproving(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        approveMessage({ messageId: id })
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk approve error:", error);
    } finally {
      setIsBulkApproving(false);
    }
  };

  // Sort messages: emergency first, then by timestamp
  const sortedMessages = [...(pendingMessages ?? [])].sort((a, b) => {
    // Priority order: P0 > P1 > P2 > P3 > undefined
    const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const aPriority = priorityOrder[a?.priority ?? "P3"] ?? 4;
    const bPriority = priorityOrder[b?.priority ?? "P3"] ?? 4;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    // Then by timestamp (oldest first)
    return (a?.timestamp ?? 0) - (b?.timestamp ?? 0);
  });

  const handleApprove = async (messageId: Id<"messages">) => {
    await approveMessage({ messageId });
  };

  const handleReject = async (messageId: Id<"messages">) => {
    await rejectMessage({ messageId });
  };

  const handleEditAndApprove = (message: typeof selectedMessage) => {
    setSelectedMessage(message);
    setDraftResponse("");
    setEditDialogOpen(true);
  };

  const handleSubmitEditedApproval = async () => {
    if (selectedMessage) {
      await approveMessage({
        messageId: selectedMessage._id,
        draftResponse: draftResponse || undefined,
      });
      setEditDialogOpen(false);
      setSelectedMessage(null);
      setDraftResponse("");
    }
  };

  const getCategoryStyle = (category?: string) => {
    switch (category) {
      case "emergency":
        return {
          badge: "bg-red-100 text-red-700 border-red-200",
          indicator: "bg-red-500",
          icon: AlertTriangle,
        };
      case "clinical":
        return {
          badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
          indicator: "bg-yellow-500",
          icon: MessageSquare,
        };
      default:
        return {
          badge: "bg-blue-100 text-blue-700 border-blue-200",
          indicator: "bg-blue-500",
          icon: MessageSquare,
        };
    }
  };

  const formatTime = (timestamp: number) => {
    const now = new Date();
    const msgDate = new Date(timestamp);
    const diffMs = now.getTime() - msgDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return msgDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  if (!doctorId) {
    return (
      <div
        className="flex flex-col flex-1"
        data-testid="approval-queue-panel"
      >
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex flex-col flex-1"
        data-testid="approval-queue-panel"
      >
        {/* Tab Switcher */}
        <div className="px-2 pt-2 border-b">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid grid-cols-3 w-full h-8">
              <TabsTrigger value="pending" className="text-xs h-7 relative">
                Pending
                {(pendingMessages?.length ?? 0) > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                    {pendingMessages?.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs h-7">
                <History className="h-3 w-3 mr-1" />
                History
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-xs h-7">
                <BarChart3 className="h-3 w-3 mr-1" />
                Stats
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Bulk Actions Bar */}
        {activeTab === "pending" && sortedMessages.length > 0 && (
          <div className="px-2 py-1.5 border-b bg-muted/30 flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === sortedMessages.length && sortedMessages.length > 0}
              onCheckedChange={(checked) => checked ? selectAll() : clearSelection()}
              className="h-4 w-4"
            />
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
            </span>
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                variant="default"
                className="h-6 text-xs ml-auto"
                onClick={handleBulkApprove}
                disabled={isBulkApproving}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                {isBulkApproving ? "Approving..." : `Approve ${selectedIds.size}`}
              </Button>
            )}
          </div>
        )}

        <ScrollArea className="flex-1">
          {/* Pending Tab */}
          {activeTab === "pending" && (
            <>
              {pendingMessages === undefined ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : sortedMessages.length === 0 ? (
                <div className="p-4 text-center">
                  <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs text-muted-foreground">
                    No messages pending approval
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {sortedMessages.map((msg) => {
                    if (!msg) return null;
                    const categoryStyle = getCategoryStyle(msg.triageCategory);
                    const CategoryIcon = categoryStyle.icon;
                    const isSelected = selectedIds.has(msg._id);

                    return (
                      <div
                        key={msg._id}
                        className={`p-3 rounded-lg border ${
                          msg.triageCategory === "emergency"
                            ? "border-red-200 bg-red-50/50"
                            : isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background"
                        }`}
                        data-testid="approval-queue-item"
                      >
                        {/* Header with checkbox */}
                        <div className="flex items-start gap-2 mb-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(msg._id)}
                            className="h-4 w-4 mt-1"
                          />
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${categoryStyle.indicator}`}
                            />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {msg.patient?.name ?? "Unknown Patient"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                      <Badge className={`text-xs ${categoryStyle.badge}`}>
                        {msg.priority || "P3"}
                      </Badge>
                    </div>

                    {/* Message Preview */}
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {msg.content}
                    </p>

                    {/* Category Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        variant="outline"
                        className={`text-xs ${categoryStyle.badge}`}
                      >
                        <CategoryIcon className="h-3 w-3 mr-1" />
                        {msg.triageCategory || "admin"}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1 h-8"
                        onClick={() => handleApprove(msg._id)}
                        data-testid="approve-btn"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() =>
                          handleEditAndApprove({
                            _id: msg._id,
                            content: msg.content,
                            patient: msg.patient,
                          })
                        }
                        data-testid="edit-approve-btn"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => handleReject(msg._id)}
                        data-testid="reject-btn"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <>
              {approvalHistory === undefined ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : approvalHistory.length === 0 ? (
                <div className="p-4 text-center">
                  <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">No history yet</p>
                  <p className="text-xs text-muted-foreground">
                    Approved and rejected messages will appear here
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {approvalHistory.map((msg) => {
                    if (!msg) return null;
                    const categoryStyle = getCategoryStyle(msg.triageCategory);

                    return (
                      <div
                        key={msg._id}
                        className="p-3 rounded-lg border border-border bg-background"
                        data-testid="history-item"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {msg.patient?.name ?? "Unknown Patient"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTime(msg.timestamp)}
                            </div>
                          </div>
                          <Badge
                            variant={msg.approved ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {msg.approved ? (
                              <><Check className="h-3 w-3 mr-1" />Approved</>
                            ) : (
                              <><X className="h-3 w-3 mr-1" />Rejected</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {msg.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Stats Tab */}
          {activeTab === "stats" && (
            <div className="p-4 space-y-4">
              {stats ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <Card className="p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                      <div className="text-xs text-muted-foreground">Approved</div>
                    </Card>
                    <Card className="p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                      <div className="text-xs text-muted-foreground">Rejected</div>
                    </Card>
                  </div>

                  {/* Approval Rate */}
                  <Card className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Approval Rate</span>
                      <span className="text-sm font-bold">{stats.approvalRate}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${stats.approvalRate}%` }}
                      />
                    </div>
                  </Card>

                  {/* Response Time */}
                  <Card className="p-3">
                    <div className="text-sm font-medium mb-1">Avg Response Time</div>
                    <div className="text-2xl font-bold">
                      {stats.avgResponseTime < 60
                        ? `${stats.avgResponseTime} min`
                        : `${Math.round(stats.avgResponseTime / 60)} hrs`}
                    </div>
                  </Card>

                  {/* By Category */}
                  <Card className="p-3">
                    <div className="text-sm font-medium mb-2">By Category</div>
                    <div className="space-y-2">
                      {Object.entries(stats.byCategory).map(([category, count]) => {
                        const style = getCategoryStyle(category);
                        return (
                          <div key={category} className="flex items-center justify-between">
                            <Badge variant="outline" className={`text-xs ${style.badge}`}>
                              {category}
                            </Badge>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading statistics...</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Edit & Approve Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Response & Approve</DialogTitle>
            <DialogDescription>
              Review the patient message and provide a response.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Original Message */}
            <div>
              <label className="text-sm font-medium">
                From: {selectedMessage?.patient?.name ?? "Unknown"}
              </label>
              <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                {selectedMessage?.content}
              </div>
            </div>

            {/* Draft Response */}
            <div>
              <label className="text-sm font-medium">
                Draft Response (optional)
              </label>
              <Textarea
                className="mt-1"
                placeholder="Type a response to send to the patient..."
                value={draftResponse}
                onChange={(e) => setDraftResponse(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEditedApproval}>
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
