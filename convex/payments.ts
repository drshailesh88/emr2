import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// Create a payment record for an appointment
export const create = mutation({
  args: {
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    appointmentId: v.id("appointments"),
    amount: v.number(), // Amount in paise
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const paymentId = await ctx.db.insert("payments", {
      doctorId: args.doctorId,
      patientId: args.patientId,
      appointmentId: args.appointmentId,
      amount: args.amount,
      currency: args.currency || "INR",
      status: "pending",
      createdAt: Date.now(),
    });

    // Log to audit
    await ctx.db.insert("auditLog", {
      doctorId: args.doctorId,
      action: "payment_created",
      details: JSON.stringify({
        paymentId,
        appointmentId: args.appointmentId,
        amount: args.amount,
      }),
      performedBy: "system",
      timestamp: Date.now(),
    });

    return paymentId;
  },
});

// Update payment with Razorpay order ID
export const setRazorpayOrderId = mutation({
  args: {
    paymentId: v.id("payments"),
    razorpayOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentId, {
      razorpayOrderId: args.razorpayOrderId,
    });
  },
});

// Update payment status to completed
export const markCompleted = mutation({
  args: {
    paymentId: v.id("payments"),
    razorpayPaymentId: v.string(),
    receiptUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    await ctx.db.patch(args.paymentId, {
      status: "completed",
      razorpayPaymentId: args.razorpayPaymentId,
      receiptUrl: args.receiptUrl,
      completedAt: Date.now(),
    });

    // Update appointment payment status
    if (payment.appointmentId) {
      await ctx.db.patch(payment.appointmentId, {
        paymentStatus: "paid",
        paymentId: args.razorpayPaymentId,
      });
    }

    // Log to audit
    await ctx.db.insert("auditLog", {
      doctorId: payment.doctorId,
      action: "payment_completed",
      details: JSON.stringify({
        paymentId: args.paymentId,
        razorpayPaymentId: args.razorpayPaymentId,
        amount: payment.amount,
      }),
      performedBy: "system",
      timestamp: Date.now(),
    });
  },
});

// Update payment status to failed
export const markFailed = mutation({
  args: {
    paymentId: v.id("payments"),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    await ctx.db.patch(args.paymentId, {
      status: "failed",
    });

    // Update appointment payment status
    if (payment.appointmentId) {
      await ctx.db.patch(payment.appointmentId, {
        paymentStatus: "failed",
      });
    }

    // Log to audit
    await ctx.db.insert("auditLog", {
      doctorId: payment.doctorId,
      action: "payment_failed",
      details: JSON.stringify({
        paymentId: args.paymentId,
        error: args.error,
      }),
      performedBy: "system",
      timestamp: Date.now(),
    });
  },
});

// Get payment by ID
export const get = query({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.paymentId);
  },
});

// Get payment by Razorpay order ID
export const getByRazorpayOrderId = query({
  args: {
    razorpayOrderId: v.string(),
  },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("razorpayOrderId"), args.razorpayOrderId))
      .first();
    return payments;
  },
});

// Get payment for an appointment
export const getByAppointment = query({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_appointment", (q) => q.eq("appointmentId", args.appointmentId))
      .first();
  },
});

// Get payment history for a patient
export const getByPatient = query({
  args: {
    patientId: v.id("patients"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db
      .query("payments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(limit);
  },
});

// Get payment history for a doctor
export const getByDoctor = query({
  args: {
    doctorId: v.id("doctors"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.status) {
      return await ctx.db
        .query("payments")
        .withIndex("by_status", (q) =>
          q.eq("doctorId", args.doctorId).eq("status", args.status!)
        )
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("payments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .order("desc")
      .take(limit);
  },
});

// Get payment statistics for a doctor
export const getStats = query({
  args: {
    doctorId: v.id("doctors"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days || 30;
    const startDate = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();

    const recentPayments = payments.filter((p) => p.createdAt >= startDate);

    const completed = recentPayments.filter((p) => p.status === "completed");
    const pending = recentPayments.filter((p) => p.status === "pending");
    const failed = recentPayments.filter((p) => p.status === "failed");

    const totalAmount = completed.reduce((sum, p) => sum + p.amount, 0);

    // Group by day
    const dailyRevenue: Record<string, number> = {};
    for (const payment of completed) {
      const day = new Date(payment.completedAt || payment.createdAt)
        .toISOString()
        .split("T")[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + payment.amount;
    }

    return {
      total: recentPayments.length,
      completed: completed.length,
      pending: pending.length,
      failed: failed.length,
      totalAmount, // in paise
      averageAmount: completed.length > 0 ? Math.round(totalAmount / completed.length) : 0,
      dailyRevenue,
    };
  },
});

// Get pending payments requiring follow-up
export const getPendingPayments = query({
  args: {
    doctorId: v.id("doctors"),
  },
  handler: async (ctx, args) => {
    const pendingPayments = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) =>
        q.eq("doctorId", args.doctorId).eq("status", "pending")
      )
      .collect();

    // Enrich with patient and appointment data
    const enriched = await Promise.all(
      pendingPayments.map(async (payment) => {
        const [patient, appointment] = await Promise.all([
          ctx.db.get(payment.patientId),
          ctx.db.get(payment.appointmentId),
        ]);
        return {
          ...payment,
          patient,
          appointment,
        };
      })
    );

    return enriched;
  },
});
