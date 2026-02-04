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

// Get today's appointments for the current doctor
export const today = query({
  args: {},
  handler: async (ctx) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) return [];

    // Get start and end of today in UTC
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    // Get appointments for today
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctorId).gte("dateTime", startOfDay).lt("dateTime", endOfDay)
      )
      .collect();

    // Sort by time
    appointments.sort((a, b) => a.dateTime - b.dateTime);

    // Get patient details for each appointment
    const withPatients = await Promise.all(
      appointments.map(async (apt) => {
        const patient = await ctx.db.get(apt.patientId);
        return {
          ...apt,
          patient: patient
            ? {
                _id: patient._id,
                name: patient.name,
                age: patient.age,
                sex: patient.sex,
              }
            : null,
        };
      })
    );

    return withPatients;
  },
});

// Get pending appointment requests
export const pending = query({
  args: {},
  handler: async (ctx) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) return [];

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_status", (q) =>
        q.eq("doctorId", doctorId).eq("status", "requested")
      )
      .collect();

    // Sort by request time (dateTime)
    appointments.sort((a, b) => a.dateTime - b.dateTime);

    // Get patient details for each appointment
    const withPatients = await Promise.all(
      appointments.map(async (apt) => {
        const patient = await ctx.db.get(apt.patientId);
        return {
          ...apt,
          patient: patient
            ? {
                _id: patient._id,
                name: patient.name,
                age: patient.age,
                sex: patient.sex,
              }
            : null,
        };
      })
    );

    return withPatients;
  },
});

// Get all appointments for a patient
export const byPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) return [];

    return await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

// Create a new appointment
export const create = mutation({
  args: {
    patientId: v.id("patients"),
    dateTime: v.number(),
    reason: v.optional(v.string()),
    status: v.optional(v.string()),
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

    const appointmentId = await ctx.db.insert("appointments", {
      doctorId,
      patientId: args.patientId,
      dateTime: args.dateTime,
      status: args.status || "confirmed",
      reason: args.reason,
    });

    return appointmentId;
  },
});

// Update appointment status
export const updateStatus = mutation({
  args: {
    id: v.id("appointments"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) {
      throw new Error("Not authenticated as a doctor");
    }

    const appointment = await ctx.db.get(args.id);
    if (!appointment || appointment.doctorId !== doctorId) {
      throw new Error("Appointment not found");
    }

    await ctx.db.patch(args.id, { status: args.status });
    return args.id;
  },
});

// Approve a pending appointment request
export const approve = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) {
      throw new Error("Not authenticated as a doctor");
    }

    const appointment = await ctx.db.get(args.id);
    if (!appointment || appointment.doctorId !== doctorId) {
      throw new Error("Appointment not found");
    }

    if (appointment.status !== "requested") {
      throw new Error("Appointment is not in requested status");
    }

    await ctx.db.patch(args.id, { status: "confirmed" });
    return args.id;
  },
});

// Decline a pending appointment request
export const decline = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    const doctorId = await getCurrentDoctorId(ctx);
    if (!doctorId) {
      throw new Error("Not authenticated as a doctor");
    }

    const appointment = await ctx.db.get(args.id);
    if (!appointment || appointment.doctorId !== doctorId) {
      throw new Error("Appointment not found");
    }

    await ctx.db.patch(args.id, { status: "cancelled" });
    return args.id;
  },
});
