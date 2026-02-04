import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { detectEmergency, getEmergencyPriority } from "./emergencyDetection";
import {
  detectAppointmentIntent,
  extractTimePreferences,
  generateAppointmentDraftResponse,
} from "./appointmentHandler";

// Store an incoming WhatsApp message
export const storeIncomingMessage = mutation({
  args: {
    whatsappMessageId: v.string(),
    senderJid: v.string(), // e.g., "919711643917@s.whatsapp.net"
    content: v.string(),
    timestamp: v.number(),
    hasMedia: v.boolean(),
    mediaType: v.optional(v.string()), // "image" | "document" | "audio"
    // For now, we'll use a default doctor - in production, route based on the receiving number
    doctorPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Extract phone number from JID (remove @s.whatsapp.net)
    const senderPhone = args.senderJid.split("@")[0];

    // Check for duplicate message (idempotency)
    const existingMessage = await ctx.db
      .query("messages")
      .withIndex("by_whatsapp_id")
      .filter((q) => q.eq(q.field("whatsappMessageId"), args.whatsappMessageId))
      .first();

    if (existingMessage) {
      return {
        messageId: existingMessage._id,
        patientId: null,
        conversationId: existingMessage.conversationId,
        isNew: false
      };
    }

    // Find or create patient
    const { patientId, doctorId, isNewPatient } = await findOrCreatePatient(
      ctx,
      senderPhone,
      args.senderJid,
      args.doctorPhone
    );

    // Find or create conversation
    const conversationId = await findOrCreateConversation(ctx, doctorId, patientId);

    // Update conversation's lastMessageAt
    await ctx.db.patch(conversationId, {
      lastMessageAt: args.timestamp,
    });

    // Run emergency detection (rules-first, no LLM)
    const emergencyResult = detectEmergency(args.content);
    const priority = getEmergencyPriority(args.content);

    // Determine triage category and intent
    let triageCategory: "emergency" | "clinical" | "admin" | undefined = undefined;
    let intent: string | undefined = undefined;
    let draftResponse: string | undefined = undefined;

    if (emergencyResult.isEmergency) {
      triageCategory = "emergency";
      intent = `emergency:${emergencyResult.categories.join(",")}`;
    } else {
      // Check for appointment intent
      const appointmentIntent = detectAppointmentIntent(args.content);
      if (appointmentIntent.isAppointmentRelated && appointmentIntent.intent) {
        triageCategory = "admin";
        intent = `appointment:${appointmentIntent.intent}`;

        // Get patient name for draft response
        const patient = await ctx.db.get(patientId);
        const patientName = patient?.name || "Patient";

        // Extract time preferences
        const timePrefs = extractTimePreferences(args.content);

        // Generate draft response
        draftResponse = generateAppointmentDraftResponse(
          appointmentIntent.intent,
          patientName,
          timePrefs,
          "english" // Default to English, could detect language
        );
      }
    }

    // Store the message with triage results
    const messageId = await ctx.db.insert("messages", {
      conversationId,
      role: "patient",
      content: args.content,
      timestamp: args.timestamp,
      whatsappMessageId: args.whatsappMessageId,
      direction: "inbound",
      requiresApproval: true, // All inbound messages require approval by default
      // Triage fields from detection
      priority: priority || undefined,
      intent,
      triageCategory,
      draftResponse,
    });

    // Log to audit
    await ctx.db.insert("auditLog", {
      doctorId,
      action: "message_received",
      details: JSON.stringify({
        messageId,
        patientId,
        isNewPatient,
        contentPreview: args.content.substring(0, 50),
      }),
      performedBy: "system",
      timestamp: Date.now(),
    });

    // If emergency detected, log separately for urgent attention
    if (emergencyResult.isEmergency) {
      await ctx.db.insert("auditLog", {
        doctorId,
        action: "emergency_detected",
        details: JSON.stringify({
          messageId,
          patientId,
          priority,
          matchedKeywords: emergencyResult.matchedKeywords,
          categories: emergencyResult.categories,
          confidence: emergencyResult.confidence,
        }),
        performedBy: "system",
        timestamp: Date.now(),
      });
    }

    // If appointment intent detected, create appointment request
    let appointmentId: Id<"appointments"> | undefined = undefined;
    if (intent?.startsWith("appointment:")) {
      const appointmentIntent = detectAppointmentIntent(args.content);
      const timePrefs = extractTimePreferences(args.content);

      if (appointmentIntent.intent === "book") {
        // Calculate preferred date
        let preferredDateTime = Date.now();
        if (timePrefs.preferredDay === "today") {
          preferredDateTime = Date.now();
        } else if (timePrefs.preferredDay === "tomorrow") {
          preferredDateTime = Date.now() + 24 * 60 * 60 * 1000;
        } else if (timePrefs.preferredDay === "dayAfter") {
          preferredDateTime = Date.now() + 2 * 24 * 60 * 60 * 1000;
        }

        // Adjust for time preference
        const date = new Date(preferredDateTime);
        if (timePrefs.preferredTime === "morning") {
          date.setHours(10, 0, 0, 0);
        } else if (timePrefs.preferredTime === "afternoon") {
          date.setHours(14, 0, 0, 0);
        } else if (timePrefs.preferredTime === "evening") {
          date.setHours(18, 0, 0, 0);
        } else {
          date.setHours(10, 0, 0, 0); // Default to 10 AM
        }

        // Create appointment with "requested" status
        appointmentId = await ctx.db.insert("appointments", {
          doctorId,
          patientId,
          dateTime: date.getTime(),
          status: "requested",
          reason: "Appointment request from WhatsApp",
        });

        // Log appointment creation
        await ctx.db.insert("auditLog", {
          doctorId,
          action: "appointment_request_created",
          details: JSON.stringify({
            messageId,
            appointmentId,
            intent: appointmentIntent.intent,
            preferredDay: timePrefs.preferredDay,
            preferredTime: timePrefs.preferredTime,
          }),
          performedBy: "system",
          timestamp: Date.now(),
        });
      }
    }

    return {
      messageId,
      patientId,
      conversationId,
      doctorId,
      isNew: true,
      isNewPatient,
      // Triage results
      isEmergency: emergencyResult.isEmergency,
      priority,
      triageCategory,
      intent,
      draftResponse,
      appointmentId,
    };
  },
});

// Helper: Find or create patient by phone number
async function findOrCreatePatient(
  ctx: MutationCtx,
  phone: string,
  whatsappId: string,
  doctorPhone?: string
): Promise<{ patientId: Id<"patients">; doctorId: Id<"doctors">; isNewPatient: boolean }> {
  // First, find a doctor (for now, get the first doctor or create a default)
  // In production, this would route based on the WhatsApp number that received the message
  let doctor = await ctx.db.query("doctors").first();

  if (!doctor) {
    // Create a default doctor for testing
    const newDoctorId = await ctx.db.insert("doctors", {
      userId: "placeholder" as Id<"users">, // Will be linked to auth later
      name: "Dr. Test",
      phone: doctorPhone || "0000000000",
      specialty: "General",
      qualifications: "MBBS",
      clinicName: "Test Clinic",
      clinicAddress: "Test Address",
      registrationNumber: "TEST001",
      adminApprovalMode: "confirm",
    });
    doctor = await ctx.db.get(newDoctorId);
  }

  const doctorId = doctor!._id;

  // Try to find existing patient by WhatsApp ID
  let patient = await ctx.db
    .query("patients")
    .withIndex("by_whatsapp")
    .filter((q) => q.eq(q.field("whatsappId"), whatsappId))
    .first();

  if (patient) {
    return { patientId: patient._id, doctorId, isNewPatient: false };
  }

  // Try to find by phone number
  patient = await ctx.db
    .query("patients")
    .withIndex("by_phone")
    .filter((q) => q.eq(q.field("phone"), phone))
    .first();

  if (patient) {
    // Update whatsappId if not set
    if (!patient.whatsappId || patient.whatsappId !== whatsappId) {
      await ctx.db.patch(patient._id, { whatsappId });
    }
    return { patientId: patient._id, doctorId, isNewPatient: false };
  }

  // Create new patient with placeholder name
  const patientId = await ctx.db.insert("patients", {
    doctorId,
    name: `Patient ${phone.slice(-4)}`, // Placeholder name using last 4 digits
    phone,
    whatsappId,
  });

  return { patientId, doctorId, isNewPatient: true };
}

// Helper: Find or create conversation
async function findOrCreateConversation(
  ctx: MutationCtx,
  doctorId: Id<"doctors">,
  patientId: Id<"patients">
): Promise<Id<"conversations">> {
  // Find existing conversation
  const conversation = await ctx.db
    .query("conversations")
    .withIndex("by_doctor_patient")
    .filter((q) =>
      q.and(
        q.eq(q.field("doctorId"), doctorId),
        q.eq(q.field("patientId"), patientId)
      )
    )
    .first();

  if (conversation) {
    return conversation._id;
  }

  // Create new conversation
  return await ctx.db.insert("conversations", {
    doctorId,
    patientId,
    channel: "whatsapp",
    lastMessageAt: Date.now(),
  });
}

// Store outbound message (when doctor/secretary sends)
export const storeOutboundMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    whatsappMessageId: v.optional(v.string()),
    role: v.string(), // "secretary" | "doctor"
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
      whatsappMessageId: args.whatsappMessageId,
      direction: "outbound",
      requiresApproval: false, // Outbound messages don't need approval
    });

    // Update conversation
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

// Get recent messages for a conversation
export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation")
      .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
      .order("desc")
      .take(limit);
  },
});

// Get messages pending approval
export const getPendingApprovalMessages = query({
  args: {
    doctorId: v.optional(v.id("doctors")),
  },
  handler: async (ctx, args) => {
    // Get all messages that require approval and haven't been approved
    const pendingMessages = await ctx.db
      .query("messages")
      .filter((q) =>
        q.and(
          q.eq(q.field("requiresApproval"), true),
          q.eq(q.field("approved"), undefined)
        )
      )
      .collect();

    // Enrich with conversation and patient data
    const enrichedMessages = await Promise.all(
      pendingMessages.map(async (msg) => {
        const conversation = await ctx.db.get(msg.conversationId);
        if (!conversation) return null;

        // Filter by doctor if specified
        if (args.doctorId && conversation.doctorId !== args.doctorId) {
          return null;
        }

        const patient = await ctx.db.get(conversation.patientId);
        return {
          ...msg,
          patient: patient ? { name: patient.name, phone: patient.phone } : null,
          conversation,
        };
      })
    );

    return enrichedMessages.filter(Boolean);
  },
});

// Get approval history (approved and rejected messages)
export const getApprovalHistory = query({
  args: {
    doctorId: v.id("doctors"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Get messages that required approval and have been processed
    const processedMessages = await ctx.db
      .query("messages")
      .filter((q) =>
        q.and(
          q.eq(q.field("requiresApproval"), true),
          q.neq(q.field("approved"), undefined)
        )
      )
      .order("desc")
      .take(limit * 2); // Take more to account for filtering

    // Enrich with conversation and patient data, filtering by doctor
    const enrichedMessages = await Promise.all(
      processedMessages.map(async (msg) => {
        const conversation = await ctx.db.get(msg.conversationId);
        if (!conversation || conversation.doctorId !== args.doctorId) {
          return null;
        }

        const patient = await ctx.db.get(conversation.patientId);
        return {
          ...msg,
          patient: patient ? { name: patient.name, phone: patient.phone } : null,
        };
      })
    );

    return enrichedMessages.filter(Boolean).slice(0, limit);
  },
});

// Approve a message (allows response to be sent)
export const approveMessage = mutation({
  args: {
    messageId: v.id("messages"),
    draftResponse: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Update message as approved
    await ctx.db.patch(args.messageId, {
      approved: true,
      approvedAt: Date.now(),
      draftResponse: args.draftResponse,
    });

    // Log to audit
    await ctx.db.insert("auditLog", {
      doctorId: conversation.doctorId,
      action: "message_approved",
      details: JSON.stringify({
        messageId: args.messageId,
        hasDraftResponse: !!args.draftResponse,
      }),
      performedBy: "doctor",
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Reject a message (discard without sending response)
export const rejectMessage = mutation({
  args: {
    messageId: v.id("messages"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Update message as rejected (approved: false)
    await ctx.db.patch(args.messageId, {
      approved: false,
      approvedAt: Date.now(),
      requiresApproval: false, // No longer needs approval
    });

    // Log to audit
    await ctx.db.insert("auditLog", {
      doctorId: conversation.doctorId,
      action: "message_rejected",
      details: JSON.stringify({
        messageId: args.messageId,
        reason: args.reason,
      }),
      performedBy: "doctor",
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Get patient by WhatsApp JID
export const getPatientByWhatsApp = query({
  args: { whatsappId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("patients")
      .withIndex("by_whatsapp")
      .filter((q) => q.eq(q.field("whatsappId"), args.whatsappId))
      .first();
  },
});
