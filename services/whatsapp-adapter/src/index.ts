/**
 * WhatsApp Adapter Service
 *
 * IMPORTANT: This service is for INTERNAL TESTING ONLY.
 * Using unofficial WhatsApp libraries violates WhatsApp's Terms of Service.
 * Do not use in production without official WhatsApp Business API.
 */

// Load environment variables first
import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import QRCode from "qrcode";
import { config, validateConfig } from "./config";
import { logger } from "./logger";
import {
  connectWhatsApp,
  disconnect,
  getConnectionStatus,
  sendTextMessage,
  setMessageHandler,
  downloadMedia,
  getMediaDetails,
} from "./socket";
import {
  storeIncomingMessage,
  isDoctorPhone,
  getDoctorByPhone,
  processDoctorReply,
  createApprovalNotification,
  markNotificationSent,
  getPendingNotifications,
  uploadFile,
  ingestFromWhatsApp,
} from "./convex-client";

const app = express();
app.use(express.json());

// Health check endpoint for Railway
app.get("/health", (req, res) => {
  const status = getConnectionStatus();
  res.json({
    status: "ok",
    whatsapp: status.status,
    timestamp: new Date().toISOString(),
  });
});

// Get connection status
app.get("/status", (req, res) => {
  const status = getConnectionStatus();
  res.json({
    connected: status.status === "connected",
    status: status.status,
    hasQrCode: !!status.qrCode,
  });
});

// Get QR code as image (for web display)
app.get("/qr", async (req, res) => {
  const status = getConnectionStatus();

  if (!status.qrCode) {
    res.status(404).json({
      error: "No QR code available",
      status: status.status,
    });
    return;
  }

  try {
    const qrImage = await QRCode.toDataURL(status.qrCode);
    res.json({
      qrCode: qrImage,
      status: status.status,
    });
  } catch (error) {
    logger.error({ error }, "Failed to generate QR code image");
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// Get QR code as raw string (for terminal display)
app.get("/qr/raw", (req, res) => {
  const status = getConnectionStatus();

  if (!status.qrCode) {
    res.status(404).json({
      error: "No QR code available",
      status: status.status,
    });
    return;
  }

  res.json({
    qrCode: status.qrCode,
    status: status.status,
  });
});

// Send a test message (for testing only)
app.post("/send", async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    res.status(400).json({ error: "phone and message are required" });
    return;
  }

  // Format phone number to JID
  const jid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;

  try {
    const result = await sendTextMessage(jid, message);
    if (result) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(503).json({ error: "Not connected to WhatsApp" });
    }
  } catch (error) {
    logger.error({ error }, "Failed to send message");
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Helper to get file extension from MIME type
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "audio/ogg": ".ogg",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "video/mp4": ".mp4",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  };
  return mimeToExt[mimeType] || "";
}

// Helper to format notification message
function formatNotificationMessage(
  patientName: string,
  messageContent: string,
  draftResponse: string | null | undefined,
  priority: string | null | undefined,
  triageCategory: string | null | undefined
): string {
  const priorityLabel = priority === "P0" ? "[URGENT] " : priority === "P1" ? "[Priority] " : "";
  const categoryEmoji =
    triageCategory === "emergency" ? "🚨" : triageCategory === "clinical" ? "📋" : "📝";

  let message = `${categoryEmoji} ${priorityLabel}New message from ${patientName}:\n\n`;
  message += `"${messageContent.substring(0, 200)}${messageContent.length > 200 ? "..." : ""}"\n\n`;

  if (draftResponse) {
    message += `Suggested response:\n"${draftResponse.substring(0, 150)}${draftResponse.length > 150 ? "..." : ""}"\n\n`;
  }

  message += `Reply:\n1️⃣ = Approve & Send\n2️⃣ = Edit Response\n❌ = Type "skip" to reject`;

  return message;
}

// Message handler - stores incoming messages to Convex
setMessageHandler(async (m) => {
  for (const msg of m.messages) {
    if (msg.key.fromMe) continue; // Skip own messages

    const sender = msg.key.remoteJid;
    if (!sender) continue;

    // Skip status broadcasts
    if (sender === "status@broadcast") continue;

    const whatsappMessageId = msg.key.id;
    if (!whatsappMessageId) continue;

    const content =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      "[media/other]";

    // Extract phone number from JID
    const senderPhone = sender.split("@")[0];

    // Check if this is from a doctor
    let isFromDoctor = false;
    let doctor: { _id: string; name: string; phone: string } | null = null;

    try {
      isFromDoctor = await isDoctorPhone(senderPhone);
      if (isFromDoctor) {
        doctor = await getDoctorByPhone(senderPhone);
      }
    } catch (error) {
      logger.warn({ error, phone: senderPhone }, "Failed to check if sender is doctor");
    }

    // Handle doctor replies
    if (isFromDoctor && doctor) {
      logger.info(
        {
          from: sender,
          doctorId: doctor._id,
          doctorName: doctor.name,
          content: content.substring(0, 50),
        },
        "Received message from doctor"
      );

      try {
        const result = await processDoctorReply(doctor._id, content);

        logger.info(
          {
            action: result.action,
            response: result.response,
          },
          "Processed doctor reply"
        );

        // Send response back to doctor
        await sendTextMessage(sender, result.response);

        // If approved/custom approved, send response to patient
        if (result.action === "approved" || result.action === "approved_custom") {
          if (result.responseToSend && result.patientId) {
            // Get patient's WhatsApp JID
            // For now, construct from patientId (would need a lookup in production)
            // This is simplified - in production you'd get the patient's whatsappId
            logger.info(
              {
                patientId: result.patientId,
                responseToSend: result.responseToSend.substring(0, 50),
              },
              "Would send approved response to patient"
            );
            // TODO: Send to patient after getting their WhatsApp JID
          }
        }
      } catch (error) {
        logger.error({ error }, "Failed to process doctor reply");
        await sendTextMessage(sender, "Error processing your request. Please try again.");
      }

      continue; // Don't process as patient message
    }

    // Regular patient message handling
    const mediaDetails = getMediaDetails(msg);
    const hasMedia = mediaDetails.mediaType !== null;

    // Determine media type for storage
    let mediaType: string | undefined = mediaDetails.mediaType || undefined;

    // Get timestamp (handle both number and object formats)
    let timestamp: number;
    if (typeof msg.messageTimestamp === "number") {
      timestamp = msg.messageTimestamp * 1000; // Convert to milliseconds
    } else if (msg.messageTimestamp && typeof msg.messageTimestamp === "object") {
      timestamp = (msg.messageTimestamp as { low: number }).low * 1000;
    } else {
      timestamp = Date.now();
    }

    logger.info(
      {
        from: sender,
        messageId: whatsappMessageId,
        content: content.substring(0, 100),
        timestamp,
        hasMedia,
        mediaType,
      },
      "Received patient message"
    );

    // Store to Convex
    try {
      const result = await storeIncomingMessage({
        whatsappMessageId,
        senderJid: sender,
        content,
        timestamp,
        hasMedia,
        mediaType,
      });

      logger.info(
        {
          messageId: result.messageId,
          conversationId: result.conversationId,
          isNew: result.isNew,
          isNewPatient: result.isNewPatient,
          isEmergency: result.isEmergency,
          priority: result.priority,
          triageCategory: result.triageCategory,
        },
        "Message stored to Convex"
      );

      // Handle media download and storage
      if (hasMedia && mediaDetails.mediaMessage && mediaDetails.mediaType && result.patientId && result.doctorId) {
        try {
          logger.info(
            { mediaType: mediaDetails.mediaType, mimeType: mediaDetails.mimeType },
            "Downloading media from WhatsApp"
          );

          // Download media from WhatsApp
          const mediaBuffer = await downloadMedia(mediaDetails.mediaMessage, mediaDetails.mediaType);

          if (mediaBuffer) {
            logger.info(
              { size: mediaBuffer.length },
              "Media downloaded, uploading to Convex storage"
            );

            // Upload to Convex storage
            const fileId = await uploadFile(mediaBuffer, mediaDetails.mimeType || "application/octet-stream");

            if (fileId) {
              // Generate filename
              const extension = getExtensionFromMimeType(mediaDetails.mimeType || "");
              const fileName = mediaDetails.fileName || `${mediaDetails.mediaType}_${Date.now()}${extension}`;

              // Map media type to document type
              let fileType: string;
              if (mediaDetails.mediaType === "image" || mediaDetails.mediaType === "sticker") {
                fileType = "image";
              } else if (mediaDetails.mediaType === "document") {
                // Check if it's a PDF
                fileType = mediaDetails.mimeType?.includes("pdf") ? "pdf" : "image";
              } else if (mediaDetails.mediaType === "audio") {
                fileType = "audio";
              } else if (mediaDetails.mediaType === "video") {
                fileType = "video";
              } else {
                fileType = "image";
              }

              // Ingest document through document ingestion service
              const docResult = await ingestFromWhatsApp({
                doctorId: result.doctorId,
                patientId: result.patientId,
                fileId,
                fileName,
                fileType,
                mimeType: mediaDetails.mimeType || "application/octet-stream",
                fileSize: mediaBuffer.length,
                messageId: result.messageId,
                caption: mediaDetails.caption || undefined,
              });

              logger.info(
                {
                  documentId: docResult.documentId,
                  fileId,
                  fileName,
                  fileType,
                  category: docResult.category,
                  needsOcr: docResult.needsOcr,
                },
                "Document ingested to Convex"
              );
            } else {
              logger.error("Failed to upload media to Convex storage");
            }
          } else {
            logger.error("Failed to download media from WhatsApp");
          }
        } catch (error) {
          logger.error({ error }, "Failed to process media attachment");
        }
      }

      // If this is a new message that requires approval, notify doctor
      if (result.isNew && result.doctorId) {
        try {
          // Create approval notification
          const notifResult = await createApprovalNotification(result.messageId);

          if (notifResult.isNew) {
            // Get pending notifications to get patient info
            const notifications = await getPendingNotifications(result.doctorId);
            const notif = notifications.find((n) => n._id === notifResult.notificationId);

            if (notif && notif.patient) {
              // Get doctor's phone to send notification
              const doctorForNotif = await getDoctorByPhone(senderPhone);

              // For now, we need to get the doctor's phone from somewhere
              // In production, this would be stored in the doctor profile
              // For testing, we'll just log that we would send a notification
              logger.info(
                {
                  notificationId: notifResult.notificationId,
                  patientName: notif.patient.name,
                  messageContent: content.substring(0, 50),
                  priority: result.priority,
                  triageCategory: result.triageCategory,
                },
                "Would send notification to doctor"
              );

              // TODO: Send notification to doctor's WhatsApp
              // This requires knowing the doctor's WhatsApp number
              // const notificationText = formatNotificationMessage(
              //   notif.patient.name,
              //   content,
              //   result.draftResponse,
              //   result.priority,
              //   result.triageCategory
              // );
              // await sendTextMessage(doctorJid, notificationText);
              // await markNotificationSent(notifResult.notificationId, sentMsg.messageId);
            }
          }
        } catch (error) {
          logger.error({ error }, "Failed to create/send approval notification");
        }
      }
    } catch (error) {
      logger.error({ error, whatsappMessageId }, "Failed to store message to Convex");
    }
  }
});

// Graceful shutdown
async function shutdown(): Promise<void> {
  logger.info("Shutting down...");
  await disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Start the service
async function start(): Promise<void> {
  try {
    validateConfig();
  } catch (error) {
    logger.error({ error }, "Configuration error");
    process.exit(1);
  }

  // Start Express server
  app.listen(config.port, () => {
    logger.info({ port: config.port }, "WhatsApp adapter service started");
    logger.warn("⚠️  INTERNAL TESTING ONLY - Do not use in production");
  });

  // Connect to WhatsApp
  try {
    await connectWhatsApp();
  } catch (error) {
    logger.error({ error }, "Failed to start WhatsApp connection");
    // Don't exit - server is still running for QR code endpoint
  }
}

start();
