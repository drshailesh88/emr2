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
} from "./socket";

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

// Message handler - logs incoming messages
setMessageHandler(async (m) => {
  for (const msg of m.messages) {
    if (msg.key.fromMe) continue; // Skip own messages

    const sender = msg.key.remoteJid;
    const content =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      "[media/other]";

    logger.info(
      {
        from: sender,
        content: content.substring(0, 100),
        timestamp: msg.messageTimestamp,
        hasMedia: !!(
          msg.message?.imageMessage ||
          msg.message?.documentMessage ||
          msg.message?.audioMessage
        ),
      },
      "Received message"
    );

    // TODO: In Task #4, this will store to Convex and trigger triage
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
