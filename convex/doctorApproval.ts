/**
 * Doctor Approval Service - Quick-reply via WhatsApp
 *
 * Allows doctors to approve pending messages directly from their personal WhatsApp.
 *
 * Flow:
 * 1. System sends pending approval notification to doctor's WhatsApp
 * 2. Format: "[Patient] asks: <message>\nDraft: <draft>\nReply: 1=Approve, 2=Edit"
 * 3. Doctor replies "1" → approval sent to patient
 * 4. Doctor replies "2" → enters edit mode
 * 5. Doctor types custom response → sent to patient
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create an approval notification for a doctor
 */
export const createApprovalNotification = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    // Get the message
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Get the conversation
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Check if notification already exists
    const existing = await ctx.db
      .query("doctorApprovalNotifications")
      .withIndex("by_message")
      .filter((q) => q.eq(q.field("messageId"), args.messageId))
      .first();

    if (existing) {
      return { notificationId: existing._id, isNew: false };
    }

    // Create notification
    const notificationId = await ctx.db.insert("doctorApprovalNotifications", {
      doctorId: conversation.doctorId,
      messageId: args.messageId,
      patientId: conversation.patientId,
      conversationId: conversation._id,
      status: "pending",
      draftResponse: message.draftResponse,
      createdAt: Date.now(),
    });

    return { notificationId, isNew: true };
  },
});

/**
 * Get pending notifications for a doctor
 */
export const getPendingNotifications = query({
  args: {
    doctorId: v.id("doctors"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("doctorApprovalNotifications")
      .withIndex("by_doctor_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("doctorId"), args.doctorId),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "notified"),
            q.eq(q.field("status"), "awaiting_edit")
          )
        )
      )
      .collect();

    // Enrich with message and patient data
    const enriched = await Promise.all(
      notifications.map(async (notif) => {
        const message = await ctx.db.get(notif.messageId);
        const patient = await ctx.db.get(notif.patientId);
        return {
          ...notif,
          message: message
            ? {
                content: message.content,
                priority: message.priority,
                triageCategory: message.triageCategory,
                timestamp: message.timestamp,
              }
            : null,
          patient: patient ? { name: patient.name, phone: patient.phone } : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get the active notification for a doctor (for processing replies)
 */
export const getActiveNotification = query({
  args: {
    doctorId: v.id("doctors"),
  },
  handler: async (ctx, args) => {
    // Get the most recent notification that's awaiting response
    const notification = await ctx.db
      .query("doctorApprovalNotifications")
      .withIndex("by_doctor_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("doctorId"), args.doctorId),
          q.or(
            q.eq(q.field("status"), "notified"),
            q.eq(q.field("status"), "awaiting_edit")
          )
        )
      )
      .order("desc")
      .first();

    if (!notification) return null;

    const message = await ctx.db.get(notification.messageId);
    const patient = await ctx.db.get(notification.patientId);

    return {
      ...notification,
      message: message
        ? {
            content: message.content,
            draftResponse: message.draftResponse,
          }
        : null,
      patient: patient ? { name: patient.name, phone: patient.phone } : null,
    };
  },
});

/**
 * Mark notification as sent to doctor
 */
export const markNotificationSent = mutation({
  args: {
    notificationId: v.id("doctorApprovalNotifications"),
    whatsappMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      status: "notified",
      notificationWhatsappId: args.whatsappMessageId,
      notifiedAt: Date.now(),
    });
  },
});

/**
 * Process doctor's reply (1 = approve, 2 = edit, or custom response)
 */
export const processDoctorReply = mutation({
  args: {
    doctorId: v.id("doctors"),
    replyContent: v.string(),
  },
  handler: async (ctx, args) => {
    const content = args.replyContent.trim();

    // Get active notification
    const notifications = await ctx.db
      .query("doctorApprovalNotifications")
      .withIndex("by_doctor_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("doctorId"), args.doctorId),
          q.or(
            q.eq(q.field("status"), "notified"),
            q.eq(q.field("status"), "awaiting_edit")
          )
        )
      )
      .order("desc")
      .collect();

    const notification = notifications[0];

    if (!notification) {
      return {
        action: "no_pending",
        response: "No pending approvals at this time.",
      };
    }

    const message = await ctx.db.get(notification.messageId);
    const patient = await ctx.db.get(notification.patientId);

    // Check the current state
    if (notification.status === "awaiting_edit") {
      // Doctor is providing a custom response
      const customResponse = content;

      // Approve the message with custom response
      await ctx.db.patch(notification.messageId, {
        approved: true,
        approvedAt: Date.now(),
        draftResponse: customResponse,
      });

      // Update notification status
      await ctx.db.patch(notification._id, {
        status: "approved",
        draftResponse: customResponse,
        respondedAt: Date.now(),
      });

      // Log to audit
      await ctx.db.insert("auditLog", {
        doctorId: args.doctorId,
        action: "whatsapp_approval_custom",
        details: JSON.stringify({
          messageId: notification.messageId,
          patientId: notification.patientId,
          customResponse: customResponse.substring(0, 100),
        }),
        performedBy: "doctor",
        timestamp: Date.now(),
      });

      return {
        action: "approved_custom",
        response: `Custom response will be sent to ${patient?.name || "patient"}.`,
        messageId: notification.messageId,
        patientId: notification.patientId,
        responseToSend: customResponse,
      };
    }

    // notification.status === "notified"
    if (content === "1") {
      // Approve with draft response
      const draftResponse = notification.draftResponse || message?.draftResponse;

      await ctx.db.patch(notification.messageId, {
        approved: true,
        approvedAt: Date.now(),
      });

      await ctx.db.patch(notification._id, {
        status: "approved",
        respondedAt: Date.now(),
      });

      // Log to audit
      await ctx.db.insert("auditLog", {
        doctorId: args.doctorId,
        action: "whatsapp_approval_quick",
        details: JSON.stringify({
          messageId: notification.messageId,
          patientId: notification.patientId,
        }),
        performedBy: "doctor",
        timestamp: Date.now(),
      });

      return {
        action: "approved",
        response: `Approved! Response sent to ${patient?.name || "patient"}.`,
        messageId: notification.messageId,
        patientId: notification.patientId,
        responseToSend: draftResponse,
      };
    }

    if (content === "2") {
      // Enter edit mode
      await ctx.db.patch(notification._id, {
        status: "awaiting_edit",
      });

      return {
        action: "awaiting_edit",
        response: `Please type your custom response for ${patient?.name || "patient"}:`,
      };
    }

    if (content.toLowerCase() === "skip" || content.toLowerCase() === "reject") {
      // Reject/skip this message
      await ctx.db.patch(notification.messageId, {
        approved: false,
        approvedAt: Date.now(),
        requiresApproval: false,
      });

      await ctx.db.patch(notification._id, {
        status: "rejected",
        respondedAt: Date.now(),
      });

      // Log to audit
      await ctx.db.insert("auditLog", {
        doctorId: args.doctorId,
        action: "whatsapp_approval_rejected",
        details: JSON.stringify({
          messageId: notification.messageId,
          patientId: notification.patientId,
        }),
        performedBy: "doctor",
        timestamp: Date.now(),
      });

      return {
        action: "rejected",
        response: "Message skipped/rejected. No response sent to patient.",
      };
    }

    // Unknown command
    return {
      action: "unknown",
      response: "Reply 1 to approve, 2 to edit, or 'skip' to reject.",
    };
  },
});

/**
 * Format notification message for WhatsApp
 */
export function formatNotificationMessage(
  patientName: string,
  messageContent: string,
  draftResponse: string | null | undefined,
  priority: string | null | undefined,
  triageCategory: string | null | undefined
): string {
  const priorityLabel = priority === "P0" ? "[URGENT] " : priority === "P1" ? "[Priority] " : "";
  const categoryEmoji =
    triageCategory === "emergency" ? "🚨" : triageCategory === "clinical" ? "📋" : "📝";

  let message = `${categoryEmoji} ${priorityLabel}New message from ${patientName}:\n\n`;
  message += `"${messageContent.substring(0, 200)}${messageContent.length > 200 ? "..." : ""}"\n\n`;

  if (draftResponse) {
    message += `Suggested response:\n"${draftResponse.substring(0, 150)}${draftResponse.length > 150 ? "..." : ""}"\n\n`;
  }

  message += `Reply:\n1️⃣ = Approve & Send\n2️⃣ = Edit Response\n❌ = Type "skip" to reject`;

  return message;
}

/**
 * Get doctor by phone number (for identifying incoming messages)
 */
export const getDoctorByPhone = query({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    // Try to find doctor by phone
    const doctor = await ctx.db
      .query("doctors")
      .withIndex("by_phone")
      .filter((q) => q.eq(q.field("phone"), args.phone))
      .first();

    return doctor;
  },
});

/**
 * Check if a phone number belongs to a doctor
 */
export const isDoctorPhone = query({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("doctors")
      .withIndex("by_phone")
      .filter((q) => q.eq(q.field("phone"), args.phone))
      .first();

    return !!doctor;
  },
});
