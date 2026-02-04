import { mutation } from "./_generated/server";

// Development only: Clear all auth data for testing
export const clearAuthData = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear auth tables
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    const sessions = await ctx.db.query("authSessions").collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    const accounts = await ctx.db.query("authAccounts").collect();
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }

    const refreshTokens = await ctx.db.query("authRefreshTokens").collect();
    for (const token of refreshTokens) {
      await ctx.db.delete(token._id);
    }

    const verificationCodes = await ctx.db.query("authVerificationCodes").collect();
    for (const code of verificationCodes) {
      await ctx.db.delete(code._id);
    }

    const rateLimits = await ctx.db.query("authRateLimits").collect();
    for (const limit of rateLimits) {
      await ctx.db.delete(limit._id);
    }

    // Clear doctor profiles too
    const doctors = await ctx.db.query("doctors").collect();
    for (const doctor of doctors) {
      await ctx.db.delete(doctor._id);
    }

    return {
      cleared: {
        users: users.length,
        sessions: sessions.length,
        accounts: accounts.length,
        refreshTokens: refreshTokens.length,
        verificationCodes: verificationCodes.length,
        rateLimits: rateLimits.length,
        doctors: doctors.length,
      },
    };
  },
});
