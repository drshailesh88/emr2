import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Medication schema
const medicationValidator = v.object({
  name: v.string(),
  dosage: v.string(),
  frequency: v.string(),
  duration: v.string(),
  instructions: v.optional(v.string()),
  instructionsHindi: v.optional(v.string()),
});

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

// List prescriptions for a patient
export const byPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) return [];

    return await ctx.db
      .query("prescriptions")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

// Get a single prescription
export const get = query({
  args: { id: v.id("prescriptions") },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) return null;

    const prescription = await ctx.db.get(args.id);
    if (!prescription || prescription.doctorId !== doctorId) {
      return null;
    }

    return prescription;
  },
});

// Get the latest prescription for a patient (for quick reference)
export const latestByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) return null;

    return await ctx.db
      .query("prescriptions")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .first();
  },
});

// Create a new prescription
export const create = mutation({
  args: {
    patientId: v.id("patients"),
    appointmentId: v.optional(v.id("appointments")),
    chiefComplaints: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    historyOfPresentIllness: v.optional(v.string()),
    generalExamination: v.optional(v.string()),
    systemicExamination: v.optional(v.string()),
    medications: v.array(medicationValidator),
    investigations: v.optional(v.array(v.string())),
    specialInstructions: v.optional(v.string()),
    followUp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) {
      throw new Error("Not authenticated as a doctor");
    }

    // Verify patient belongs to this doctor
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== doctorId) {
      throw new Error("Patient not found");
    }

    const prescriptionId = await ctx.db.insert("prescriptions", {
      doctorId,
      patientId: args.patientId,
      appointmentId: args.appointmentId,
      chiefComplaints: args.chiefComplaints,
      diagnosis: args.diagnosis,
      historyOfPresentIllness: args.historyOfPresentIllness,
      generalExamination: args.generalExamination,
      systemicExamination: args.systemicExamination,
      medications: args.medications,
      investigations: args.investigations,
      specialInstructions: args.specialInstructions,
      followUp: args.followUp,
      createdAt: Date.now(),
    });

    return prescriptionId;
  },
});

// Update a prescription
export const update = mutation({
  args: {
    id: v.id("prescriptions"),
    chiefComplaints: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    historyOfPresentIllness: v.optional(v.string()),
    generalExamination: v.optional(v.string()),
    systemicExamination: v.optional(v.string()),
    medications: v.optional(v.array(medicationValidator)),
    investigations: v.optional(v.array(v.string())),
    specialInstructions: v.optional(v.string()),
    followUp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) {
      throw new Error("Not authenticated as a doctor");
    }

    const prescription = await ctx.db.get(args.id);
    if (!prescription || prescription.doctorId !== doctorId) {
      throw new Error("Prescription not found");
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

// Mark prescription as sent
export const markSent = mutation({
  args: {
    id: v.id("prescriptions"),
    via: v.array(v.string()), // ["whatsapp", "email"]
  },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) {
      throw new Error("Not authenticated as a doctor");
    }

    const prescription = await ctx.db.get(args.id);
    if (!prescription || prescription.doctorId !== doctorId) {
      throw new Error("Prescription not found");
    }

    await ctx.db.patch(args.id, {
      sentVia: args.via,
      sentAt: Date.now(),
    });

    return args.id;
  },
});
