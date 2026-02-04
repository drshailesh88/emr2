// Baileys auth state adapter using Convex for persistence
import type { AuthenticationCreds, SignalDataTypeMap } from "@whiskeysockets/baileys";
import { proto } from "@whiskeysockets/baileys";
import { config } from "./config";
import { getSession, saveSession } from "./convex-client";
import { logger } from "./logger";

type AuthState = {
  creds: AuthenticationCreds;
  keys: {
    get: <T extends keyof SignalDataTypeMap>(
      type: T,
      ids: string[]
    ) => Promise<{ [id: string]: SignalDataTypeMap[T] | undefined }>;
    set: (data: { [type: string]: { [id: string]: unknown } }) => Promise<void>;
  };
};

// In-memory cache for keys (persisted as part of credentials JSON)
let keysCache: Record<string, Record<string, unknown>> = {};

// Initialize auth creds with defaults
function initAuthCreds(): AuthenticationCreds {
  return {
    noiseKey: { private: new Uint8Array(32), public: new Uint8Array(32) },
    pairingEphemeralKeyPair: { private: new Uint8Array(32), public: new Uint8Array(32) },
    signedIdentityKey: { private: new Uint8Array(32), public: new Uint8Array(32) },
    signedPreKey: {
      keyPair: { private: new Uint8Array(32), public: new Uint8Array(32) },
      signature: new Uint8Array(64),
      keyId: 1,
    },
    registrationId: 0,
    advSecretKey: "",
    processedHistoryMessages: [],
    nextPreKeyId: 1,
    firstUnuploadedPreKeyId: 1,
    accountSyncCounter: 0,
    accountSettings: {
      unarchiveChats: false,
    },
    registered: false,
    pairingCode: undefined,
    lastPropHash: undefined,
    routingInfo: undefined,
  };
}

// Serialize credentials and keys to JSON
function serializeState(creds: AuthenticationCreds): string {
  const serializable = {
    creds: {
      ...creds,
      noiseKey: {
        private: Array.from(creds.noiseKey.private),
        public: Array.from(creds.noiseKey.public),
      },
      pairingEphemeralKeyPair: {
        private: Array.from(creds.pairingEphemeralKeyPair.private),
        public: Array.from(creds.pairingEphemeralKeyPair.public),
      },
      signedIdentityKey: {
        private: Array.from(creds.signedIdentityKey.private),
        public: Array.from(creds.signedIdentityKey.public),
      },
      signedPreKey: {
        keyPair: {
          private: Array.from(creds.signedPreKey.keyPair.private),
          public: Array.from(creds.signedPreKey.keyPair.public),
        },
        signature: Array.from(creds.signedPreKey.signature),
        keyId: creds.signedPreKey.keyId,
      },
      me: creds.me,
      account: creds.account,
      signalIdentities: creds.signalIdentities,
    },
    keys: keysCache,
  };
  return JSON.stringify(serializable);
}

// Deserialize credentials and keys from JSON
function deserializeState(json: string): { creds: AuthenticationCreds; keys: Record<string, Record<string, unknown>> } {
  const parsed = JSON.parse(json);

  const creds: AuthenticationCreds = {
    ...initAuthCreds(),
    ...parsed.creds,
    noiseKey: {
      private: new Uint8Array(parsed.creds.noiseKey.private),
      public: new Uint8Array(parsed.creds.noiseKey.public),
    },
    pairingEphemeralKeyPair: {
      private: new Uint8Array(parsed.creds.pairingEphemeralKeyPair.private),
      public: new Uint8Array(parsed.creds.pairingEphemeralKeyPair.public),
    },
    signedIdentityKey: {
      private: new Uint8Array(parsed.creds.signedIdentityKey.private),
      public: new Uint8Array(parsed.creds.signedIdentityKey.public),
    },
    signedPreKey: {
      keyPair: {
        private: new Uint8Array(parsed.creds.signedPreKey.keyPair.private),
        public: new Uint8Array(parsed.creds.signedPreKey.keyPair.public),
      },
      signature: new Uint8Array(parsed.creds.signedPreKey.signature),
      keyId: parsed.creds.signedPreKey.keyId,
    },
  };

  return {
    creds,
    keys: parsed.keys || {},
  };
}

// Create auth state that persists to Convex
export async function useConvexAuthState(): Promise<{
  state: AuthState;
  saveCreds: () => Promise<void>;
}> {
  const sessionId = config.sessionId;
  let creds: AuthenticationCreds;

  // Try to load existing session from Convex
  const existingSession = await getSession(sessionId);

  if (existingSession && existingSession.credentialsJson !== "{}") {
    try {
      const deserialized = deserializeState(existingSession.credentialsJson);
      creds = deserialized.creds;
      keysCache = deserialized.keys;
      logger.info("Loaded existing session from Convex");
    } catch (err) {
      logger.warn({ err }, "Failed to deserialize existing session, starting fresh");
      creds = initAuthCreds();
      keysCache = {};
    }
  } else {
    logger.info("No existing session, starting fresh");
    creds = initAuthCreds();
    keysCache = {};
  }

  const saveCreds = async (): Promise<void> => {
    const serialized = serializeState(creds);
    await saveSession(sessionId, serialized, "connected");
    logger.debug("Saved credentials to Convex");
  };

  const state: AuthState = {
    creds,
    keys: {
      get: async (type, ids) => {
        const data: { [id: string]: SignalDataTypeMap[typeof type] | undefined } = {};
        const typeCache = keysCache[type] || {};

        for (const id of ids) {
          let value = typeCache[id] as SignalDataTypeMap[typeof type] | undefined;
          if (value && type === "app-state-sync-key") {
            value = proto.Message.AppStateSyncKeyData.fromObject(value as object) as unknown as SignalDataTypeMap[typeof type];
          }
          data[id] = value;
        }

        return data;
      },
      set: async (data) => {
        for (const type in data) {
          if (!keysCache[type]) {
            keysCache[type] = {};
          }
          for (const id in data[type]) {
            const value = data[type][id];
            if (value) {
              keysCache[type][id] = value;
            } else {
              delete keysCache[type][id];
            }
          }
        }
        // Save to Convex after key updates
        await saveCreds();
      },
    },
  };

  return { state, saveCreds };
}
