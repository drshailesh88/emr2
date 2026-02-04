import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get documents pending OCR processing
export const getPendingDocuments = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_processing_status", (q) => q.eq("processingStatus", "pending"))
      .take(limit);

    // Get file URLs for each document
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const url = await ctx.storage.getUrl(doc.fileId);
        return { ...doc, url };
      })
    );

    return documentsWithUrls;
  },
});

// Mark document as processing (lock it)
export const markProcessing = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Only process pending documents
    if (document.processingStatus !== "pending") {
      return { success: false, reason: "Document is not pending" };
    }

    await ctx.db.patch(args.documentId, {
      processingStatus: "processing",
    });

    return { success: true };
  },
});

// Complete document processing with results
export const completeProcessing = mutation({
  args: {
    documentId: v.id("documents"),
    extractedText: v.string(),
    summary: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(args.documentId, {
      processingStatus: "completed",
      extractedText: args.extractedText,
      summary: args.summary,
      category: args.category || document.category,
      processedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mark document processing as failed
export const markFailed = mutation({
  args: {
    documentId: v.id("documents"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      processingStatus: "failed",
      processingError: args.error,
      processedAt: Date.now(),
    });
  },
});

// Retry failed document processing
export const retryProcessing = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    if (document.processingStatus !== "failed") {
      return { success: false, reason: "Document processing did not fail" };
    }

    await ctx.db.patch(args.documentId, {
      processingStatus: "pending",
      processingError: undefined,
      processedAt: undefined,
    });

    return { success: true };
  },
});

// Get processing statistics for a doctor
export const getProcessingStats = query({
  args: {
    doctorId: v.id("doctors"),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();

    const stats = {
      total: documents.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const doc of documents) {
      switch (doc.processingStatus) {
        case "pending":
          stats.pending++;
          break;
        case "processing":
          stats.processing++;
          break;
        case "completed":
          stats.completed++;
          break;
        case "failed":
          stats.failed++;
          break;
      }
    }

    return stats;
  },
});

// Ingest a document from WhatsApp
export const ingestFromWhatsApp = mutation({
  args: {
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    messageId: v.optional(v.id("messages")),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Determine category based on file type and caption
    let category = "whatsapp_media";

    // Try to infer category from caption if present
    if (args.caption) {
      const captionLower = args.caption.toLowerCase();
      if (captionLower.includes("report") || captionLower.includes("test") || captionLower.includes("lab")) {
        category = "lab_report";
      } else if (captionLower.includes("prescription") || captionLower.includes("rx")) {
        category = "prescription";
      } else if (captionLower.includes("discharge") || captionLower.includes("summary")) {
        category = "discharge_summary";
      } else if (captionLower.includes("ecg") || captionLower.includes("ekg")) {
        category = "ecg";
      }
    }

    // Determine if this document needs OCR processing
    const needsOcr = args.fileType === "image" || args.fileType === "pdf";

    const documentId = await ctx.db.insert("documents", {
      doctorId: args.doctorId,
      patientId: args.patientId,
      fileId: args.fileId,
      fileName: args.fileName,
      fileType: args.fileType,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      category,
      sourceType: "whatsapp",
      sourceMessageId: args.messageId,
      processingStatus: needsOcr ? "pending" : "completed",
      uploadedAt: Date.now(),
    });

    // If linked to a message, update the message's attachments
    if (args.messageId) {
      const message = await ctx.db.get(args.messageId);
      if (message) {
        const existingAttachments = message.attachments || [];
        await ctx.db.patch(args.messageId, {
          attachments: [...existingAttachments, args.fileId],
        });
      }
    }

    return {
      documentId,
      needsOcr,
      category,
    };
  },
});

// Ingest a document from direct upload (EMR dashboard)
export const ingestFromUpload = mutation({
  args: {
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    mimeType: v.string(),
    fileSize: v.number(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Default category based on file type
    let category = args.category || "medical_record";

    // Determine if this document needs OCR processing
    const needsOcr = args.fileType === "image" || args.fileType === "pdf";

    const documentId = await ctx.db.insert("documents", {
      doctorId: args.doctorId,
      patientId: args.patientId,
      fileId: args.fileId,
      fileName: args.fileName,
      fileType: args.fileType,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      category,
      sourceType: "upload",
      processingStatus: needsOcr ? "pending" : "completed",
      uploadedAt: Date.now(),
    });

    return {
      documentId,
      needsOcr,
      category,
    };
  },
});

// Get document with full details including patient info
export const getDocumentWithContext = query({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) return null;

    const [patient, url] = await Promise.all([
      ctx.db.get(document.patientId),
      ctx.storage.getUrl(document.fileId),
    ]);

    return {
      ...document,
      url,
      patient: patient ? {
        name: patient.name,
        phone: patient.phone,
        age: patient.age,
        sex: patient.sex,
      } : null,
    };
  },
});

// Get all failed documents for a doctor (for manual review)
export const getFailedDocuments = query({
  args: {
    doctorId: v.id("doctors"),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .filter((q) => q.eq(q.field("processingStatus"), "failed"))
      .collect();

    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const url = await ctx.storage.getUrl(doc.fileId);
        return { ...doc, url };
      })
    );

    return documentsWithUrls;
  },
});

// Batch retry all failed documents for a doctor
export const retryAllFailed = mutation({
  args: {
    doctorId: v.id("doctors"),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .filter((q) => q.eq(q.field("processingStatus"), "failed"))
      .collect();

    let count = 0;
    for (const doc of documents) {
      await ctx.db.patch(doc._id, {
        processingStatus: "pending",
        processingError: undefined,
        processedAt: undefined,
      });
      count++;
    }

    return { retriedCount: count };
  },
});
