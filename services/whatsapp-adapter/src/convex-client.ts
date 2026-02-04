// Convex HTTP client for WhatsApp adapter service
import { config } from "./config";

type ConvexValue = string | number | boolean | null | undefined | ConvexValue[] | { [key: string]: ConvexValue };

async function callConvex(
  functionPath: string,
  args: Record<string, ConvexValue>,
  type: "query" | "mutation"
): Promise<unknown> {
  const endpoint = type === "query" ? "query" : "mutation";
  const url = `${config.convexUrl}/api/${endpoint}`;

  // Skip auth header for local development
  const isLocalDev = config.convexUrl.includes("127.0.0.1") || config.convexUrl.includes("localhost");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!isLocalDev && config.convexDeployKey) {
    headers["Authorization"] = `Convex ${config.convexDeployKey}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      path: functionPath,
      args,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Convex ${type} failed: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as { value: unknown };
  return result.value;
}

// Session management
export async function getSession(sessionId: string): Promise<{
  sessionId: string;
  credentialsJson: string;
  status: string;
  lastConnected?: number;
  qrCode?: string;
} | null> {
  const result = await callConvex("whatsapp:getSession", { sessionId }, "query");
  return result as {
    sessionId: string;
    credentialsJson: string;
    status: string;
    lastConnected?: number;
    qrCode?: string;
  } | null;
}

export async function saveSession(
  sessionId: string,
  credentialsJson: string,
  status: string
): Promise<void> {
  await callConvex(
    "whatsapp:saveSession",
    { sessionId, credentialsJson, status },
    "mutation"
  );
}

export async function updateSessionStatus(
  sessionId: string,
  status: string,
  qrCode?: string
): Promise<void> {
  await callConvex(
    "whatsapp:updateSessionStatus",
    { sessionId, status, qrCode },
    "mutation"
  );
}

// Message queue
export async function getPendingMessages(): Promise<
  Array<{
    _id: string;
    recipientJid: string;
    content: string;
    mediaUrl?: string;
    mediaType?: string;
  }>
> {
  const result = await callConvex("whatsapp:getPendingMessages", {}, "query");
  return result as Array<{
    _id: string;
    recipientJid: string;
    content: string;
    mediaUrl?: string;
    mediaType?: string;
  }>;
}

export async function markMessageSent(
  messageId: string,
  whatsappMessageId: string
): Promise<void> {
  await callConvex(
    "whatsapp:markMessageSent",
    { messageId, whatsappMessageId },
    "mutation"
  );
}

export async function markMessageFailed(
  messageId: string,
  error: string
): Promise<void> {
  await callConvex(
    "whatsapp:markMessageFailed",
    { messageId, error },
    "mutation"
  );
}

// Message intake - store incoming WhatsApp messages
export async function storeIncomingMessage(args: {
  whatsappMessageId: string;
  senderJid: string;
  content: string;
  timestamp: number;
  hasMedia: boolean;
  mediaType?: string;
}): Promise<{
  messageId: string;
  patientId: string | null;
  conversationId: string;
  doctorId?: string;
  isNew: boolean;
  isNewPatient?: boolean;
  isEmergency?: boolean;
  priority?: string;
  triageCategory?: string;
  intent?: string;
  draftResponse?: string;
}> {
  const result = await callConvex("messageIntake:storeIncomingMessage", args, "mutation");
  return result as {
    messageId: string;
    patientId: string | null;
    conversationId: string;
    doctorId?: string;
    isNew: boolean;
    isNewPatient?: boolean;
    isEmergency?: boolean;
    priority?: string;
    triageCategory?: string;
    intent?: string;
    draftResponse?: string;
  };
}

// Doctor approval functions
export async function isDoctorPhone(phone: string): Promise<boolean> {
  const result = await callConvex("doctorApproval:isDoctorPhone", { phone }, "query");
  return result as boolean;
}

export async function getDoctorByPhone(phone: string): Promise<{
  _id: string;
  name: string;
  phone: string;
} | null> {
  const result = await callConvex("doctorApproval:getDoctorByPhone", { phone }, "query");
  return result as { _id: string; name: string; phone: string } | null;
}

export async function processDoctorReply(doctorId: string, replyContent: string): Promise<{
  action: string;
  response: string;
  messageId?: string;
  patientId?: string;
  responseToSend?: string;
}> {
  const result = await callConvex(
    "doctorApproval:processDoctorReply",
    { doctorId, replyContent },
    "mutation"
  );
  return result as {
    action: string;
    response: string;
    messageId?: string;
    patientId?: string;
    responseToSend?: string;
  };
}

export async function createApprovalNotification(messageId: string): Promise<{
  notificationId: string;
  isNew: boolean;
}> {
  const result = await callConvex(
    "doctorApproval:createApprovalNotification",
    { messageId },
    "mutation"
  );
  return result as { notificationId: string; isNew: boolean };
}

export async function markNotificationSent(
  notificationId: string,
  whatsappMessageId?: string
): Promise<void> {
  await callConvex(
    "doctorApproval:markNotificationSent",
    { notificationId, whatsappMessageId },
    "mutation"
  );
}

export async function getPendingNotifications(doctorId: string): Promise<
  Array<{
    _id: string;
    messageId: string;
    patientId: string;
    status: string;
    draftResponse?: string;
    message: {
      content: string;
      priority?: string;
      triageCategory?: string;
      timestamp: number;
    } | null;
    patient: { name: string; phone: string } | null;
  }>
> {
  const result = await callConvex(
    "doctorApproval:getPendingNotifications",
    { doctorId },
    "query"
  );
  return result as Array<{
    _id: string;
    messageId: string;
    patientId: string;
    status: string;
    draftResponse?: string;
    message: {
      content: string;
      priority?: string;
      triageCategory?: string;
      timestamp: number;
    } | null;
    patient: { name: string; phone: string } | null;
  }>;
}

// Get patient phone by patient ID
export async function getPatientPhone(patientId: string): Promise<string | null> {
  const result = await callConvex("patients:getPhone", { patientId }, "query");
  return result as string | null;
}

// Document storage functions

// Generate an upload URL for file storage
export async function generateUploadUrl(): Promise<string> {
  const result = await callConvex("documents:generateUploadUrl", {}, "mutation");
  return result as string;
}

// Upload file to Convex storage
export async function uploadFile(buffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    // Get upload URL
    const uploadUrl = await generateUploadUrl();

    // Convert Buffer to Blob for fetch body (works across all environments)
    const blob = new Blob([buffer], { type: mimeType });

    // Upload the file
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": mimeType,
      },
      body: blob,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as { storageId: string };
    return result.storageId;
  } catch (error) {
    console.error("Failed to upload file:", error);
    return null;
  }
}

// Store document metadata in Convex
export async function storeDocument(args: {
  doctorId: string;
  patientId: string;
  fileId: string;
  fileName: string;
  fileType: string;
  category?: string;
  messageId?: string;
}): Promise<{ documentId: string }> {
  const result = await callConvex("documents:storeDocument", args, "mutation");
  return result as { documentId: string };
}

// Update document with extracted text (after OCR)
export async function updateDocumentText(args: {
  documentId: string;
  extractedText: string;
  summary?: string;
  category?: string;
}): Promise<void> {
  await callConvex("documents:updateExtractedText", args, "mutation");
}

// Get file URL for viewing
export async function getFileUrl(fileId: string): Promise<string | null> {
  const result = await callConvex("documents:getFileUrl", { fileId }, "query");
  return result as string | null;
}
