import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Placeholder schema - will be expanded in Task #2
export default defineSchema({
  // Initial placeholder table for testing connection
  testConnection: defineTable({
    message: v.string(),
  }),
});
