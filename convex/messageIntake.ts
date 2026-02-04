import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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

    // Store the message
    const messageId = await ctx.db.insert("messages", {
      conversationId,
      role: "patient",
      content: args.content,
      timestamp: args.timestamp,
      whatsappMessageId: args.whatsappMessageId,
      direction: "inbound",
      requiresApproval: true, // All inbound messages require approval by default
      // Triage fields will be filled later by triage service
      priority: undefined,
      intent: undefined,
      triageCategory: undefined,
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

    return {
      messageId,
      patientId,
      conversationId,
      doctorId,
      isNew: true,
      isNewPatient,
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
