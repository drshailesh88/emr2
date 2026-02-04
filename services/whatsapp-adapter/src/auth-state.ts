// Baileys auth state adapter
// Uses file-based storage for local dev, with Convex sync for persistence
import {
  useMultiFileAuthState,
  type AuthenticationState,
} from "@whiskeysockets/baileys";
import * as path from "path";
import * as fs from "fs";
import { config } from "./config";
import { saveSession, updateSessionStatus } from "./convex-client";
import { logger } from "./logger";

const AUTH_DIR = path.join(process.cwd(), ".auth", config.sessionId);

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

// Create auth state using Baileys' file-based helper
// This properly generates cryptographic keys
export async function useConvexAuthState(): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  logger.info({ authDir: AUTH_DIR }, "Using auth directory");

  // Use Baileys' built-in file auth state
  const { state, saveCreds: fileSaveCreds } = await useMultiFileAuthState(AUTH_DIR);

  // Wrapper to also sync to Convex (for cloud persistence later)
  const saveCreds = async (): Promise<void> => {
    // Save to files first (Baileys' default)
    await fileSaveCreds();

    // Also try to sync to Convex for backup (non-blocking)
    try {
      const credsPath = path.join(AUTH_DIR, "creds.json");
      if (fs.existsSync(credsPath)) {
        const credsJson = fs.readFileSync(credsPath, "utf-8");
        await saveSession(config.sessionId, credsJson, "connected");
        logger.debug("Synced credentials to Convex");
      }
    } catch (err) {
      logger.warn({ err }, "Failed to sync credentials to Convex (non-fatal)");
    }
  };

  return { state, saveCreds };
}

// Update connection status in Convex
export async function syncConnectionStatus(
  status: string,
  qrCode?: string
): Promise<void> {
  try {
    await updateSessionStatus(config.sessionId, status, qrCode);
  } catch (err) {
    logger.warn({ err }, "Failed to sync connection status to Convex");
  }
}
