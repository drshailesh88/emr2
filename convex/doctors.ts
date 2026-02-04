import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Query to list all doctors (for testing)
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("doctors").collect();
  },
});

// Query to get a doctor by ID
export const get = query({
  args: { doctorId: v.id("doctors") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.doctorId);
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

// Create a doctor profile for authenticated user
export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    specialty: v.string(),
    qualifications: v.string(),
    clinicName: v.string(),
    clinicAddress: v.string(),
    registrationNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if doctor profile already exists
    const existing = await ctx.db
      .query("doctors")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      throw new Error("Doctor profile already exists");
    }

    const doctorId = await ctx.db.insert("doctors", {
      userId,
      name: args.name,
      phone: args.phone,
      email: args.email,
      specialty: args.specialty,
      qualifications: args.qualifications,
      clinicName: args.clinicName,
      clinicAddress: args.clinicAddress,
      registrationNumber: args.registrationNumber,
      adminApprovalMode: "confirm",
    });

    return doctorId;
  },
});
