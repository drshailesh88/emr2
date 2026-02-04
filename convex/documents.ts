import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate an upload URL for storing files
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Store a document record after file upload
export const storeDocument = mutation({
  args: {
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(), // "pdf" | "image" | "audio" | "video"
    mimeType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    category: v.optional(v.string()), // "lab_report" | "prescription" | "discharge_summary" | "whatsapp_media"
    sourceType: v.optional(v.string()), // "whatsapp" | "upload" | "email"
    messageId: v.optional(v.id("messages")), // Link to originating message if from WhatsApp
  },
  handler: async (ctx, args) => {
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
      category: args.category,
      sourceType: args.sourceType,
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

    return { documentId, needsOcr };
  },
});

// Get documents for a patient
export const getByPatient = query({
  args: {
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();

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

// Get documents for a doctor
export const getByDoctor = query({
  args: {
    doctorId: v.id("doctors"),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();

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

// Get a single document by ID
export const getById = query({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) return null;

    const url = await ctx.storage.getUrl(document.fileId);
    return { ...document, url };
  },
});

// Get file URL for a storage ID
export const getFileUrl = query({
  args: {
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.fileId);
  },
});

// Update document with extracted text (after OCR)
export const updateExtractedText = mutation({
  args: {
    documentId: v.id("documents"),
    extractedText: v.string(),
    summary: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      extractedText: args.extractedText,
      summary: args.summary,
      category: args.category,
    });
  },
});

// Delete a document
export const deleteDocument = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) return;

    // Delete the file from storage
    await ctx.storage.delete(document.fileId);

    // Delete the document record
    await ctx.db.delete(args.documentId);
  },
});

// Search documents by patient and category
export const searchByCategory = query({
  args: {
    patientId: v.id("patients"),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_patient_category", (q) =>
        q.eq("patientId", args.patientId).eq("category", args.category)
      )
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

// Search documents by text content
export const searchDocuments = query({
  args: {
    doctorId: v.id("doctors"),
    query: v.string(),
    category: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const queryLower = args.query.toLowerCase();

    // Get all documents for this doctor
    const allDocuments = await ctx.db
      .query("documents")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();

    // Get all patients for patient name search
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();

    const patientMap = new Map(patients.map((p) => [p._id, p]));

    // Filter documents based on search criteria
    const filteredDocuments = allDocuments.filter((doc) => {
      // Category filter
      if (args.category && doc.category !== args.category) {
        return false;
      }

      // Date range filter
      if (args.startDate && doc.uploadedAt < args.startDate) {
        return false;
      }
      if (args.endDate && doc.uploadedAt > args.endDate) {
        return false;
      }

      // Text search (in filename, extracted text, summary, or patient name)
      const patient = patientMap.get(doc.patientId);
      const searchableText = [
        doc.fileName,
        doc.extractedText,
        doc.summary,
        patient?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(queryLower);
    });

    // Sort by date (newest first) and limit
    const sortedDocuments = filteredDocuments
      .sort((a, b) => b.uploadedAt - a.uploadedAt)
      .slice(0, limit);

    // Get file URLs and patient info
    const documentsWithDetails = await Promise.all(
      sortedDocuments.map(async (doc) => {
        const url = await ctx.storage.getUrl(doc.fileId);
        const patient = patientMap.get(doc.patientId);
        return {
          ...doc,
          url,
          patientName: patient?.name || "Unknown",
        };
      })
    );

    return documentsWithDetails;
  },
});

// Get recent documents for a doctor (last 50)
export const getRecentDocuments = query({
  args: {
    doctorId: v.id("doctors"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .order("desc")
      .take(limit);

    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const url = await ctx.storage.getUrl(doc.fileId);
        return { ...doc, url };
      })
    );

    return documentsWithUrls;
  },
});
