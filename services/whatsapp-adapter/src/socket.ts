// Baileys socket manager
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadContentFromMessage,
  type WASocket,
  type BaileysEventMap,
  type DownloadableMessage,
  type MediaType,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { useConvexAuthState, syncConnectionStatus } from "./auth-state";
import { config } from "./config";
import { logger } from "./logger";

let sock: WASocket | null = null;
let qrCode: string | null = null;
let connectionStatus: "disconnected" | "connecting" | "connected" | "qr_pending" = "disconnected";
let reconnectAttempts = 0;

// Message handler callback
type MessageHandler = (message: BaileysEventMap["messages.upsert"]) => Promise<void>;
let messageHandler: MessageHandler | null = null;

export function setMessageHandler(handler: MessageHandler): void {
  messageHandler = handler;
}

export function getConnectionStatus(): {
  status: typeof connectionStatus;
  qrCode: string | null;
} {
  return { status: connectionStatus, qrCode };
}

export function getSocket(): WASocket | null {
  return sock;
}

export async function connectWhatsApp(): Promise<void> {
  try {
    connectionStatus = "connecting";
    await syncConnectionStatus("connecting");
    logger.info("Connecting to WhatsApp...");

    // Get latest Baileys version
    const { version, isLatest } = await fetchLatestBaileysVersion();
    logger.info({ version, isLatest }, "Using Baileys version");

    // Load auth state (file-based with Convex sync)
    const { state, saveCreds } = await useConvexAuthState();

    // Create socket with auth state from Baileys
    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      defaultQueryTimeoutMs: 60000,
      emitOwnEvents: true,
      markOnlineOnConnect: false,
    });

    // Handle connection updates
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCode = qr;
        connectionStatus = "qr_pending";
        await syncConnectionStatus("qr_pending", qr);
        logger.info("QR code generated, waiting for scan...");
      }

      if (connection === "close") {
        qrCode = null;
        connectionStatus = "disconnected";

        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        logger.info({ statusCode, shouldReconnect }, "Connection closed");

        if (shouldReconnect) {
          reconnectAttempts++;
          const delay = Math.min(
            config.reconnect.baseDelayMs * Math.pow(2, reconnectAttempts - 1),
            config.reconnect.maxDelayMs
          );

          if (reconnectAttempts <= config.reconnect.maxRetries) {
            logger.info({ attempt: reconnectAttempts, delay }, "Reconnecting...");
            await syncConnectionStatus("reconnecting");
            setTimeout(connectWhatsApp, delay);
          } else {
            logger.error("Max reconnection attempts reached");
            await syncConnectionStatus("disconnected");
          }
        } else {
          logger.info("Logged out, not reconnecting");
          await syncConnectionStatus("logged_out");
        }
      }

      if (connection === "open") {
        qrCode = null;
        connectionStatus = "connected";
        reconnectAttempts = 0;
        await syncConnectionStatus("connected");
        logger.info("Connected to WhatsApp!");
      }
    });

    // Handle credential updates - save to files and sync to Convex
    sock.ev.on("creds.update", saveCreds);

    // Handle incoming messages
    sock.ev.on("messages.upsert", async (m) => {
      if (messageHandler) {
        try {
          await messageHandler(m);
        } catch (error) {
          logger.error({ error }, "Error handling message");
        }
      }
    });
  } catch (error) {
    logger.error({ error }, "Failed to connect to WhatsApp");
    connectionStatus = "disconnected";
    await syncConnectionStatus("error");
    throw error;
  }
}

// Send a text message
export async function sendTextMessage(
  jid: string,
  text: string
): Promise<{ messageId: string } | null> {
  if (!sock || connectionStatus !== "connected") {
    logger.warn("Cannot send message: not connected");
    return null;
  }

  try {
    const result = await sock.sendMessage(jid, { text });
    logger.info({ jid, messageId: result?.key?.id }, "Message sent");
    return { messageId: result?.key?.id || "" };
  } catch (error) {
    logger.error({ error, jid }, "Failed to send message");
    throw error;
  }
}

// Send a document/image
export async function sendMediaMessage(
  jid: string,
  mediaUrl: string,
  mediaType: "image" | "document",
  caption?: string
): Promise<{ messageId: string } | null> {
  if (!sock || connectionStatus !== "connected") {
    logger.warn("Cannot send media: not connected");
    return null;
  }

  try {
    const response = await fetch(mediaUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    const messageContent =
      mediaType === "image"
        ? { image: buffer, caption }
        : { document: buffer, fileName: "document", mimetype: contentType, caption };

    const result = await sock.sendMessage(jid, messageContent);
    logger.info({ jid, mediaType, messageId: result?.key?.id }, "Media sent");
    return { messageId: result?.key?.id || "" };
  } catch (error) {
    logger.error({ error, jid, mediaType }, "Failed to send media");
    throw error;
  }
}

// Download media from a WhatsApp message
export async function downloadMedia(
  message: DownloadableMessage,
  mediaType: MediaType
): Promise<Buffer | null> {
  try {
    const stream = await downloadContentFromMessage(message, mediaType);
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    logger.info({ mediaType, size: buffer.length }, "Media downloaded");
    return buffer;
  } catch (error) {
    logger.error({ error, mediaType }, "Failed to download media");
    return null;
  }
}

// Get media message details
export function getMediaDetails(msg: BaileysEventMap["messages.upsert"]["messages"][0]): {
  mediaType: MediaType | null;
  mediaMessage: DownloadableMessage | null;
  mimeType: string | null;
  fileName: string | null;
  caption: string | null;
} {
  const message = msg.message;

  if (message?.imageMessage) {
    return {
      mediaType: "image",
      mediaMessage: message.imageMessage as DownloadableMessage,
      mimeType: message.imageMessage.mimetype || "image/jpeg",
      fileName: null,
      caption: message.imageMessage.caption || null,
    };
  }

  if (message?.documentMessage) {
    return {
      mediaType: "document",
      mediaMessage: message.documentMessage as DownloadableMessage,
      mimeType: message.documentMessage.mimetype || "application/octet-stream",
      fileName: message.documentMessage.fileName || "document",
      caption: message.documentMessage.caption || null,
    };
  }

  if (message?.audioMessage) {
    return {
      mediaType: "audio",
      mediaMessage: message.audioMessage as DownloadableMessage,
      mimeType: message.audioMessage.mimetype || "audio/ogg",
      fileName: null,
      caption: null,
    };
  }

  if (message?.videoMessage) {
    return {
      mediaType: "video",
      mediaMessage: message.videoMessage as DownloadableMessage,
      mimeType: message.videoMessage.mimetype || "video/mp4",
      fileName: null,
      caption: message.videoMessage.caption || null,
    };
  }

  if (message?.stickerMessage) {
    return {
      mediaType: "sticker",
      mediaMessage: message.stickerMessage as DownloadableMessage,
      mimeType: message.stickerMessage.mimetype || "image/webp",
      fileName: null,
      caption: null,
    };
  }

  return {
    mediaType: null,
    mediaMessage: null,
    mimeType: null,
    fileName: null,
    caption: null,
  };
}

// Graceful shutdown
export async function disconnect(): Promise<void> {
  if (sock) {
    try {
      await sock.logout();
    } catch {
      // Ignore errors during logout
    }
    sock = null;
  }
  connectionStatus = "disconnected";
  await syncConnectionStatus("disconnected");
  logger.info("Disconnected from WhatsApp");
}
