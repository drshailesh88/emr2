// Configuration for WhatsApp adapter service

export const config = {
  // Express server port
  port: parseInt(process.env.PORT || "3001", 10),

  // Session identifier for this adapter instance
  sessionId: process.env.SESSION_ID || "default",

  // Convex deployment URL (required)
  convexUrl: process.env.CONVEX_URL || "",

  // Convex deploy key for mutations (required)
  convexDeployKey: process.env.CONVEX_DEPLOY_KEY || "",

  // Reconnection settings
  reconnect: {
    maxRetries: 5,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
  },

  // Message sending rate limit (ms between messages)
  sendRateLimitMs: 1500,

  // Log level
  logLevel: process.env.LOG_LEVEL || "info",
};

export function validateConfig(): void {
  if (!config.convexUrl) {
    throw new Error("CONVEX_URL environment variable is required");
  }
  if (!config.convexDeployKey) {
    throw new Error("CONVEX_DEPLOY_KEY environment variable is required");
  }
}
