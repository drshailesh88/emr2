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
}> {
  const result = await callConvex("messageIntake:storeIncomingMessage", args, "mutation");
  return result as {
    messageId: string;
    patientId: string | null;
    conversationId: string;
    doctorId?: string;
    isNew: boolean;
    isNewPatient?: boolean;
  };
}
