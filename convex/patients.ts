import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to get current doctor ID
async function getCurrentDoctorId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const doctor = await ctx.db
    .query("doctors")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  return doctor?._id ?? null;
}

// List all patients for the current doctor
export const list = query({
  args: {},
  handler: async (ctx) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) return [];

    return await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", doctorId))
      .collect();
  },
});

// Search patients by name or phone
export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) return [];

    const searchLower = args.searchTerm.toLowerCase();

    // Get all patients for doctor and filter client-side
    // Note: For production, consider adding a search index
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", doctorId))
      .collect();

    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.phone.includes(args.searchTerm)
    );
  },
});

// Get a single patient by ID
export const get = query({
  args: { id: v.id("patients") },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) return null;

    const patient = await ctx.db.get(args.id);

    // Security: ensure patient belongs to this doctor
    if (!patient || patient.doctorId !== doctorId) {
      return null;
    }

    return patient;
  },
});

// Create a new patient
export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    whatsappId: v.optional(v.string()),
    age: v.optional(v.number()),
    sex: v.optional(v.string()),
    email: v.optional(v.string()),
    allergies: v.optional(v.array(v.string())),
    comorbidities: v.optional(v.array(v.string())),
    currentMedications: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) {
      throw new Error("Not authenticated as a doctor");
    }

    const patientId = await ctx.db.insert("patients", {
      doctorId,
      name: args.name,
      phone: args.phone,
      whatsappId: args.whatsappId || args.phone, // Default to phone if not provided
      age: args.age,
      sex: args.sex,
      email: args.email,
      allergies: args.allergies,
      comorbidities: args.comorbidities,
      currentMedications: args.currentMedications,
    });

    return patientId;
  },
});

// Get patient phone by ID (for WhatsApp adapter)
export const getPhone = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    return patient?.phone ?? null;
  },
});

// Get patient WhatsApp JID by ID
export const getWhatsAppId = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    return patient?.whatsappId ?? null;
  },
});

// Update a patient
export const update = mutation({
  args: {
    id: v.id("patients"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsappId: v.optional(v.string()),
    age: v.optional(v.number()),
    sex: v.optional(v.string()),
    email: v.optional(v.string()),
    allergies: v.optional(v.array(v.string())),
    comorbidities: v.optional(v.array(v.string())),
    currentMedications: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) {
      throw new Error("Not authenticated as a doctor");
    }

    const patient = await ctx.db.get(args.id);
    if (!patient || patient.doctorId !== doctorId) {
      throw new Error("Patient not found");
    }

    const { id, ...updates } = args;
    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, cleanUpdates);
    return id;
  },
});
