import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get audit logs for a doctor with optional filters
export const getByDoctor = query({
  args: {
    doctorId: v.id("doctors"),
    limit: v.optional(v.number()),
    actionFilter: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    // Get all audit logs for the doctor, ordered by timestamp desc
    let logs = await ctx.db
      .query("auditLog")
      .withIndex("by_doctor_time", (q) => q.eq("doctorId", args.doctorId))
      .order("desc")
      .take(limit * 2); // Take more to allow for filtering

    // Apply filters
    if (args.actionFilter) {
      logs = logs.filter((log) =>
        log.action.toLowerCase().includes(args.actionFilter!.toLowerCase())
      );
    }

    if (args.startDate) {
      logs = logs.filter((log) => log.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      logs = logs.filter((log) => log.timestamp <= args.endDate!);
    }

    // Limit results
    return logs.slice(0, limit);
  },
});

// Get unique action types for filter dropdown
export const getActionTypes = query({
  args: {
    doctorId: v.id("doctors"),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("auditLog")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .take(500);

    const actionTypes = [...new Set(logs.map((log) => log.action))];
    return actionTypes.sort();
  },
});

// Get audit log statistics
export const getStats = query({
  args: {
    doctorId: v.id("doctors"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days || 7;
    const startDate = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    const logs = await ctx.db
      .query("auditLog")
      .withIndex("by_doctor_time", (q) => q.eq("doctorId", args.doctorId))
      .order("desc")
      .collect();

    const recentLogs = logs.filter((log) => log.timestamp >= startDate);

    // Count by action type
    const actionCounts: Record<string, number> = {};
    for (const log of recentLogs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    }

    // Count by performer
    const performerCounts: Record<string, number> = {};
    for (const log of recentLogs) {
      performerCounts[log.performedBy] = (performerCounts[log.performedBy] || 0) + 1;
    }

    // Count by day
    const dailyCounts: Record<string, number> = {};
    for (const log of recentLogs) {
      const day = new Date(log.timestamp).toISOString().split("T")[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }

    return {
      total: logs.length,
      recent: recentLogs.length,
      byAction: actionCounts,
      byPerformer: performerCounts,
      byDay: dailyCounts,
    };
  },
});

// Create audit log entry (for explicit logging from frontend)
export const create = mutation({
  args: {
    doctorId: v.id("doctors"),
    action: v.string(),
    details: v.string(),
    performedBy: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLog", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// Export audit logs as CSV-compatible data
export const exportLogs = query({
  args: {
    doctorId: v.id("doctors"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 1000;

    let logs = await ctx.db
      .query("auditLog")
      .withIndex("by_doctor_time", (q) => q.eq("doctorId", args.doctorId))
      .order("desc")
      .take(limit * 2);

    if (args.startDate) {
      logs = logs.filter((log) => log.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      logs = logs.filter((log) => log.timestamp <= args.endDate!);
    }

    // Format for export
    return logs.slice(0, limit).map((log) => ({
      timestamp: new Date(log.timestamp).toISOString(),
      action: log.action,
      details: log.details,
      performedBy: log.performedBy,
    }));
  },
});
