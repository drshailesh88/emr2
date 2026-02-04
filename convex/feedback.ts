import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Submit feedback
export const submit = mutation({
  args: {
    doctorId: v.id("doctors"),
    category: v.string(), // "bug", "feature", "usability", "other"
    rating: v.optional(v.number()), // 1-5
    message: v.string(),
    page: v.optional(v.string()), // Which page the feedback is from
    metadata: v.optional(v.string()), // JSON string of additional context
  },
  handler: async (ctx, args) => {
    const feedbackId = await ctx.db.insert("feedback", {
      doctorId: args.doctorId,
      category: args.category,
      rating: args.rating,
      message: args.message,
      page: args.page,
      metadata: args.metadata,
      status: "new",
      createdAt: Date.now(),
    });

    // Log to audit
    await ctx.db.insert("auditLog", {
      doctorId: args.doctorId,
      action: "feedback_submitted",
      details: JSON.stringify({
        feedbackId,
        category: args.category,
        rating: args.rating,
      }),
      performedBy: "doctor",
      timestamp: Date.now(),
    });

    return feedbackId;
  },
});

// Get feedback for a doctor
export const getByDoctor = query({
  args: {
    doctorId: v.id("doctors"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db
      .query("feedback")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .order("desc")
      .take(limit);
  },
});

// Get all feedback (admin)
export const getAll = query({
  args: {
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    let feedbackQuery = ctx.db.query("feedback");

    if (args.status) {
      feedbackQuery = feedbackQuery.filter((q) =>
        q.eq(q.field("status"), args.status)
      );
    }

    if (args.category) {
      feedbackQuery = feedbackQuery.filter((q) =>
        q.eq(q.field("category"), args.category)
      );
    }

    return await feedbackQuery.order("desc").take(limit);
  },
});

// Update feedback status (admin)
export const updateStatus = mutation({
  args: {
    feedbackId: v.id("feedback"),
    status: v.string(), // "new", "reviewed", "in_progress", "resolved", "wont_fix"
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.feedbackId, {
      status: args.status,
      adminNotes: args.adminNotes,
      reviewedAt: Date.now(),
    });
  },
});

// Get feedback statistics
export const getStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days || 30;
    const startDate = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    const allFeedback = await ctx.db.query("feedback").collect();
    const recentFeedback = allFeedback.filter((f) => f.createdAt >= startDate);

    // Category breakdown
    const byCategory: Record<string, number> = {};
    for (const f of recentFeedback) {
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    }

    // Status breakdown
    const byStatus: Record<string, number> = {};
    for (const f of recentFeedback) {
      byStatus[f.status] = (byStatus[f.status] || 0) + 1;
    }

    // Average rating
    const withRating = recentFeedback.filter((f) => f.rating);
    const avgRating =
      withRating.length > 0
        ? withRating.reduce((sum, f) => sum + (f.rating || 0), 0) / withRating.length
        : null;

    return {
      total: recentFeedback.length,
      byCategory,
      byStatus,
      averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      responseRate:
        recentFeedback.length > 0
          ? (recentFeedback.filter((f) => f.status !== "new").length /
              recentFeedback.length) *
            100
          : 0,
    };
  },
});

// Submit NPS (Net Promoter Score) rating
export const submitNPS = mutation({
  args: {
    doctorId: v.id("doctors"),
    score: v.number(), // 0-10
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.score < 0 || args.score > 10) {
      throw new Error("NPS score must be between 0 and 10");
    }

    const feedbackId = await ctx.db.insert("feedback", {
      doctorId: args.doctorId,
      category: "nps",
      rating: args.score,
      message: args.comment || `NPS Score: ${args.score}`,
      status: "new",
      createdAt: Date.now(),
    });

    return feedbackId;
  },
});
