import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query to list all doctors (for testing)
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("doctors").collect();
  },
});

// Query to get a doctor by phone number
export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("doctors")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

// Mutation to create a test doctor (for verification)
export const createTestDoctor = mutation({
  args: {},
  handler: async (ctx) => {
    const doctorId = await ctx.db.insert("doctors", {
      name: "Dr. Test",
      phone: "+911234567890",
      email: "test@example.com",
      specialty: "General Medicine",
      qualifications: "MBBS",
      clinicName: "Test Clinic",
      clinicAddress: "123 Test Street",
      registrationNumber: "TEST123",
      adminApprovalMode: "confirm",
    });
    return doctorId;
  },
});
