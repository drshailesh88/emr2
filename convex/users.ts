import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get the currently authenticated user
export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

// Get the doctor profile for the current user
export const currentDoctor = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const doctor = await ctx.db
      .query("doctors")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return doctor;
  },
});
