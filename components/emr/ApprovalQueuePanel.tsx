"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  const approveMessage = useMutation(api.messageIntake.approveMessage);
  const rejectMessage = useMutation(api.messageIntake.rejectMessage);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<{
    _id: Id<"messages">;
    content: string;
    patient: { name: string; phone: string } | null;
  } | null>(null);
  const [draftResponse, setDraftResponse] = useState("");

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
        <ScrollArea className="flex-1">
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

                return (
                  <div
                    key={msg._id}
                    className={`p-3 rounded-lg border ${
                      msg.triageCategory === "emergency"
                        ? "border-red-200 bg-red-50/50"
                        : "border-border bg-background"
                    }`}
                    data-testid="approval-queue-item"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-2 mb-2">
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
