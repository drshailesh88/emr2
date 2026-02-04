/**
 * Triage Service - Rules-first emergency detection
 *
 * This service provides triage functionality for incoming messages.
 * Emergency detection uses keyword matching ONLY (no LLM calls).
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { detectEmergency, getEmergencyPriority } from "./emergencyDetection";

/**
 * Triage an incoming message
 * Updates the message with priority, intent, and triageCategory
 */
export const triageMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Run emergency detection (rules-first, no LLM)
    const emergencyResult = detectEmergency(message.content);
    const priority = getEmergencyPriority(message.content);

    // Determine triage category
    let triageCategory: "emergency" | "clinical" | "admin" = "admin";
    if (emergencyResult.isEmergency) {
      triageCategory = "emergency";
    }
    // Note: clinical vs admin detection could use LLM later,
    // but for now we're being conservative

    // Update the message with triage results
    await ctx.db.patch(args.messageId, {
      priority: priority || "P3", // Default to lowest priority if not emergency
      triageCategory,
      // Store emergency detection metadata in a way that's useful
      intent: emergencyResult.isEmergency
        ? `emergency:${emergencyResult.categories.join(",")}`
        : undefined,
    });

    // If emergency, log to audit
    if (emergencyResult.isEmergency) {
      const conversation = await ctx.db.get(message.conversationId);
      if (conversation) {
        await ctx.db.insert("auditLog", {
          doctorId: conversation.doctorId,
          action: "emergency_detected",
          details: JSON.stringify({
            messageId: args.messageId,
            priority,
            matchedKeywords: emergencyResult.matchedKeywords,
            categories: emergencyResult.categories,
            confidence: emergencyResult.confidence,
          }),
          performedBy: "system",
          timestamp: Date.now(),
        });
      }
    }

    return {
      isEmergency: emergencyResult.isEmergency,
      priority,
      triageCategory,
      matchedKeywords: emergencyResult.matchedKeywords,
      categories: emergencyResult.categories,
      confidence: emergencyResult.confidence,
    };
  },
});

/**
 * Get emergency messages for a doctor
 * Returns all P0 and P1 messages that haven't been addressed
 */
export const getEmergencyMessages = query({
  args: {
    doctorId: v.id("doctors"),
  },
  handler: async (ctx, args) => {
    // Get all conversations for this doctor
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_doctor")
      .filter((q) => q.eq(q.field("doctorId"), args.doctorId))
      .collect();

    const conversationIds = conversations.map((c) => c._id);

    // Get emergency messages (P0 or P1) that require approval
    const emergencyMessages = [];

    for (const convId of conversationIds) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation")
        .filter((q) =>
          q.and(
            q.eq(q.field("conversationId"), convId),
            q.eq(q.field("triageCategory"), "emergency"),
            q.eq(q.field("requiresApproval"), true),
            q.eq(q.field("approved"), undefined)
          )
        )
        .collect();

      emergencyMessages.push(...messages);
    }

    // Sort by priority (P0 first) then by timestamp (oldest first)
    emergencyMessages.sort((a, b) => {
      if (a.priority !== b.priority) {
        return (a.priority || "P3").localeCompare(b.priority || "P3");
      }
      return a.timestamp - b.timestamp;
    });

    // Enrich with patient data
    const enriched = await Promise.all(
      emergencyMessages.map(async (msg) => {
        const conversation = await ctx.db.get(msg.conversationId);
        if (!conversation) return null;

        const patient = await ctx.db.get(conversation.patientId);
        return {
          ...msg,
          patient: patient ? { name: patient.name, phone: patient.phone } : null,
        };
      })
    );

    return enriched.filter(Boolean);
  },
});

/**
 * Quick check if a message content is an emergency
 * Useful for pre-flight checks before storing
 */
export const checkEmergency = query({
  args: {
    content: v.string(),
  },
  handler: async (_ctx, args) => {
    const result = detectEmergency(args.content);
    const priority = getEmergencyPriority(args.content);

    return {
      isEmergency: result.isEmergency,
      priority,
      matchedKeywords: result.matchedKeywords,
      categories: result.categories,
      confidence: result.confidence,
    };
  },
});

/**
 * Get triage statistics for a doctor
 */
export const getTriageStats = query({
  args: {
    doctorId: v.id("doctors"),
    sinceDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sinceDays = args.sinceDays || 7;
    const sinceTimestamp = Date.now() - sinceDays * 24 * 60 * 60 * 1000;

    // Get all conversations for this doctor
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_doctor")
      .filter((q) => q.eq(q.field("doctorId"), args.doctorId))
      .collect();

    const conversationIds = conversations.map((c) => c._id);

    let totalMessages = 0;
    let emergencyCount = 0;
    let p0Count = 0;
    let p1Count = 0;

    for (const convId of conversationIds) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation")
        .filter((q) =>
          q.and(
            q.eq(q.field("conversationId"), convId),
            q.gte(q.field("timestamp"), sinceTimestamp)
          )
        )
        .collect();

      for (const msg of messages) {
        if (msg.direction === "inbound") {
          totalMessages++;
          if (msg.triageCategory === "emergency") {
            emergencyCount++;
            if (msg.priority === "P0") p0Count++;
            if (msg.priority === "P1") p1Count++;
          }
        }
      }
    }

    return {
      totalMessages,
      emergencyCount,
      p0Count,
      p1Count,
      emergencyRate: totalMessages > 0 ? emergencyCount / totalMessages : 0,
      periodDays: sinceDays,
    };
  },
});
