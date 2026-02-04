import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Auth tables from @convex-dev/auth
  ...authTables,

  // Doctor profiles and settings
  doctors: defineTable({
    userId: v.id("users"), // Link to auth users table
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    specialty: v.string(),
    qualifications: v.string(),
    clinicName: v.string(),
    clinicAddress: v.string(),
    registrationNumber: v.string(),
    // Settings
    adminApprovalMode: v.string(), // "autonomous" | "confirm"
    emergencyTemplate: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_phone", ["phone"])
    .index("by_email", ["email"]),

  // Patient records linked to doctors
  patients: defineTable({
    doctorId: v.id("doctors"),
    name: v.string(),
    phone: v.string(),
    whatsappId: v.string(),
    age: v.optional(v.number()),
    sex: v.optional(v.string()),
    email: v.optional(v.string()),
    // Medical
    allergies: v.optional(v.array(v.string())),
    comorbidities: v.optional(v.array(v.string())),
    currentMedications: v.optional(v.array(v.string())),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_phone", ["phone"])
    .index("by_whatsapp", ["whatsappId"]),

  // Message threads between patients and secretary
  conversations: defineTable({
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    channel: v.string(), // "whatsapp" | "email" | "emr"
    lastMessageAt: v.number(),
    summary: v.optional(v.string()),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_patient", ["patientId"])
    .index("by_doctor_patient", ["doctorId", "patientId"]),

  // Individual messages with triage metadata
  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.string(), // "patient" | "secretary" | "doctor"
    content: v.string(),
    attachments: v.optional(v.array(v.id("_storage"))),
    timestamp: v.number(),
    // WhatsApp tracking
    whatsappMessageId: v.optional(v.string()), // Original WhatsApp message ID
    direction: v.optional(v.string()), // "inbound" | "outbound"
    // Triage
    priority: v.optional(v.string()), // "P0" | "P1" | "P2" | "P3"
    intent: v.optional(v.string()),
    triageCategory: v.optional(v.string()), // "emergency" | "clinical" | "admin"
    requiresApproval: v.boolean(),
    approved: v.optional(v.boolean()),
    approvedAt: v.optional(v.number()),
    // Draft response (for approval workflow)
    draftResponse: v.optional(v.string()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_time", ["conversationId", "timestamp"])
    .index("by_approval_status", ["requiresApproval", "approved"])
    .index("by_whatsapp_id", ["whatsappMessageId"]),

  // Appointment scheduling
  appointments: defineTable({
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    dateTime: v.number(),
    status: v.string(), // "requested" | "confirmed" | "completed" | "cancelled"
    reason: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    paymentId: v.optional(v.string()),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_patient", ["patientId"])
    .index("by_doctor_date", ["doctorId", "dateTime"])
    .index("by_status", ["doctorId", "status"]),

  // Full prescription records
  prescriptions: defineTable({
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    appointmentId: v.optional(v.id("appointments")),
    // Content
    chiefComplaints: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    historyOfPresentIllness: v.optional(v.string()),
    generalExamination: v.optional(v.string()),
    systemicExamination: v.optional(v.string()),
    medications: v.array(
      v.object({
        name: v.string(),
        dosage: v.string(),
        frequency: v.string(),
        duration: v.string(),
        instructions: v.optional(v.string()),
        instructionsHindi: v.optional(v.string()),
      })
    ),
    investigations: v.optional(v.array(v.string())),
    specialInstructions: v.optional(v.string()),
    followUp: v.optional(v.string()),
    // Output
    pdfFileId: v.optional(v.id("_storage")),
    sentVia: v.optional(v.array(v.string())), // ["whatsapp", "email"]
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_patient", ["patientId"])
    .index("by_appointment", ["appointmentId"]),

  // Patient document uploads with OCR data
  documents: defineTable({
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(), // "pdf" | "image" | "audio" | "video"
    mimeType: v.optional(v.string()), // Full MIME type for processing
    fileSize: v.optional(v.number()), // File size in bytes
    category: v.optional(v.string()), // "lab_report" | "prescription" | "discharge_summary" | "whatsapp_media"
    // Processing status
    processingStatus: v.optional(v.string()), // "pending" | "processing" | "completed" | "failed"
    processingError: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    // OCR/extraction results
    extractedText: v.optional(v.string()),
    summary: v.optional(v.string()),
    // Source tracking
    sourceType: v.optional(v.string()), // "whatsapp" | "upload" | "email"
    sourceMessageId: v.optional(v.id("messages")), // Link to originating message
    uploadedAt: v.number(),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_patient", ["patientId"])
    .index("by_patient_category", ["patientId", "category"])
    .index("by_processing_status", ["processingStatus"]),

  // Razorpay payment tracking
  payments: defineTable({
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    appointmentId: v.id("appointments"),
    amount: v.number(),
    currency: v.string(),
    razorpayOrderId: v.optional(v.string()),
    razorpayPaymentId: v.optional(v.string()),
    status: v.string(), // "pending" | "completed" | "failed"
    receiptUrl: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_patient", ["patientId"])
    .index("by_appointment", ["appointmentId"])
    .index("by_status", ["doctorId", "status"]),

  // Audit log for compliance
  auditLog: defineTable({
    doctorId: v.id("doctors"),
    action: v.string(),
    details: v.string(),
    performedBy: v.string(), // "doctor" | "secretary" | "system"
    timestamp: v.number(),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_doctor_time", ["doctorId", "timestamp"]),

  // WhatsApp session credentials (Baileys auth state)
  whatsappSessions: defineTable({
    sessionId: v.string(), // Unique identifier for this session
    credentialsJson: v.string(), // Serialized Baileys credentials
    lastConnected: v.optional(v.number()),
    status: v.string(), // "connected" | "disconnected" | "qr_pending"
    qrCode: v.optional(v.string()), // Current QR code if waiting for scan
  })
    .index("by_session", ["sessionId"]),

  // WhatsApp message queue for outbound messages
  whatsappOutbox: defineTable({
    recipientJid: v.string(), // WhatsApp JID (phone@s.whatsapp.net)
    content: v.string(),
    mediaUrl: v.optional(v.string()),
    mediaType: v.optional(v.string()), // "image" | "document" | "audio"
    status: v.string(), // "pending" | "sent" | "failed"
    messageId: v.optional(v.string()), // WhatsApp message ID after sending
    error: v.optional(v.string()),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_recipient", ["recipientJid"]),

  // Doctor approval notifications (for quick-reply via WhatsApp)
  doctorApprovalNotifications: defineTable({
    doctorId: v.id("doctors"),
    messageId: v.id("messages"), // The message requiring approval
    patientId: v.id("patients"),
    conversationId: v.id("conversations"),
    // Notification state
    status: v.string(), // "pending" | "notified" | "awaiting_edit" | "approved" | "rejected"
    draftResponse: v.optional(v.string()),
    // WhatsApp tracking
    notificationWhatsappId: v.optional(v.string()), // WhatsApp ID of the notification sent
    // Timing
    createdAt: v.number(),
    notifiedAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_doctor_status", ["doctorId", "status"])
    .index("by_message", ["messageId"]),
});
