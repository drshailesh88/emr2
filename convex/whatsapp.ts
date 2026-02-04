import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get session credentials
export const getSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    return session;
  },
});

// Save/update session credentials
export const saveSession = mutation({
  args: {
    sessionId: v.string(),
    credentialsJson: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        credentialsJson: args.credentialsJson,
        status: args.status,
        lastConnected: Date.now(),
        qrCode: undefined, // Clear QR code on successful auth
      });
      return existing._id;
    } else {
      return await ctx.db.insert("whatsappSessions", {
        sessionId: args.sessionId,
        credentialsJson: args.credentialsJson,
        status: args.status,
        lastConnected: Date.now(),
      });
    }
  },
});

// Update session status (connected/disconnected)
export const updateSessionStatus = mutation({
  args: {
    sessionId: v.string(),
    status: v.string(),
    qrCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        qrCode: args.qrCode,
        lastConnected: args.status === "connected" ? Date.now() : existing.lastConnected,
      });
    } else {
      await ctx.db.insert("whatsappSessions", {
        sessionId: args.sessionId,
        credentialsJson: "{}",
        status: args.status,
        qrCode: args.qrCode,
      });
    }
  },
});

// Get current QR code for a session
export const getQrCode = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    return session?.qrCode || null;
  },
});

// Get connection status
export const getConnectionStatus = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    return {
      status: session?.status || "disconnected",
      lastConnected: session?.lastConnected,
      hasQrCode: !!session?.qrCode,
    };
  },
});

// Queue outbound message
export const queueOutboundMessage = mutation({
  args: {
    recipientJid: v.string(),
    content: v.string(),
    mediaUrl: v.optional(v.string()),
    mediaType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("whatsappOutbox", {
      recipientJid: args.recipientJid,
      content: args.content,
      mediaUrl: args.mediaUrl,
      mediaType: args.mediaType,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Get pending outbound messages
export const getPendingMessages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("whatsappOutbox")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

// Mark message as sent
export const markMessageSent = mutation({
  args: {
    messageId: v.id("whatsappOutbox"),
    whatsappMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "sent",
      messageId: args.whatsappMessageId,
      sentAt: Date.now(),
    });
  },
});

// Mark message as failed
export const markMessageFailed = mutation({
  args: {
    messageId: v.id("whatsappOutbox"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "failed",
      error: args.error,
    });
  },
});
