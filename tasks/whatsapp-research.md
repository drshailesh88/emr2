# WhatsApp Integration Research: Baileys & OpenClaw

## Executive Summary

Two approaches for WhatsApp integration in internal testing:

1. **Baileys**: Open-source TypeScript library that reverse-engineers WhatsApp Web
2. **OpenClaw**: Managed AI assistant platform using Baileys under the hood

Both are suitable for **INTERNAL TESTING ONLY** and carry risks for production use.

**Recommendation**: Direct Baileys integration for better control with existing Convex + Claude stack.

---

## 1. Baileys Library Overview

### What is Baileys?

Baileys is an open-source TypeScript/JavaScript library that automates WhatsApp Web interactions through WebSocket protocol emulation. It directly communicates with WhatsApp's servers by mimicking WhatsApp Web's connection pattern.

**Key Characteristics:**
- Reverse-engineered implementation (not affiliated with WhatsApp)
- Event-driven, asynchronous architecture built on Node.js EventEmitter
- Requires Node.js >= 20.0.0
- TypeScript support with full type definitions
- Community-maintained

### How It Works

1. Mimics the WhatsApp Web protocol via WebSocket
2. Uses WhatsApp's Linked Devices authentication mechanism
3. Maintains session state through credential persistence
4. Emits events for connection changes, messages, and group updates

---

## 2. Authentication Flow

### QR Code Authentication

**Process:**
1. Initialize Baileys socket with `makeWASocket()`
2. Listen to `connection.update` event
3. Capture QR string when emitted
4. Display QR code to user (terminal or web)
5. User scans with WhatsApp on their phone
6. Connection established

### Critical: Forced Disconnect After Scan

After scanning QR code, **WhatsApp forcibly disconnects the socket**. This is expected:
- Listen for `DisconnectReason.restartRequired`
- Save credentials before disconnect
- Create new socket with saved credentials
- New socket connects without requiring QR scan

---

## 3. Session Persistence

### Auth State Components

- Session keys for encryption
- Device keys for verification
- Registration tokens
- Encryption state

**Must persist to avoid re-scanning QR code on restarts.**

### Storage Options

| Option | Use Case |
|--------|----------|
| `useMultiFileAuthState` | File-based, testing only |
| MongoDB | Production-grade NoSQL |
| Redis | High-performance cache |
| PostgreSQL/MySQL | Enterprise SQL |
| **Convex** | Recommended for this project |

### Critical Event: `creds.update`

Baileys emits `creds.update` **every time credentials change** (after every message). Must implement persistent saving or session will deteriorate.

---

## 4. Message Types Supported

**Text:**
- `conversation` (simple text)
- `extendedTextMessage` (with formatting)

**Media:**
- `imageMessage` (photos)
- `videoMessage` (videos)
- `audioMessage` (voice/music)
- `documentMessage` (PDF, Word, Excel)
- `stickerMessage` (WhatsApp stickers)

**Special:**
- `contactMessage` (vCard)
- `locationMessage` (GPS)
- `buttonReplyMessage` (interactive)

### Message Structure

```javascript
{
  key: {
    remoteJid: "123456789@s.whatsapp.net",  // Sender's JID
    fromMe: false,
    id: "XXXXXX"
  },
  message: {
    conversation: "Hello, doctor!",
    // OR for documents:
    documentMessage: {
      url: "...",
      mediaKey: "...",
      fileName: "prescription.pdf",
      mimetype: "application/pdf"
    }
  },
  messageTimestamp: 1704067200,
  pushName: "Patient Name"
}
```

---

## 5. Rate Limits and Constraints

### Message Rate Limits

- **Recommended**: 1 message per 1-2 seconds
- **Unsafe**: More than 5 messages per second
- **Escalation threshold**: >100 unique contacts in short timespan

### Session Timeouts

- **24-hour timeout**: Sessions disconnect after ~24 hours (server-side)
- **Connection code 428**: "Too many reconnect attempts"

### Mitigation

- Exponential backoff for reconnection (2s, 4s, 8s, 16s max)
- `connectTimeoutMs`: 60,000ms
- `keepAliveIntervalMs`: 30,000ms
- Monitor DisconnectReason patterns

---

## 6. WhatsApp ToS and Risks

### Official Position

Using Baileys in **any commercial context** violates WhatsApp's Terms of Service.

### Account Ban Risks

**What Triggers Bans:**
1. Bulk messaging to many contacts
2. Unusual connection patterns (rapid connect/disconnect)
3. API detection - WhatsApp detects unofficial libraries
4. High message volume vs human baseline
5. New account + immediate mass messaging

### For Internal Testing

- Use **dedicated testing phone number** (not personal)
- Use spare Android phone + eSIM if possible
- **Do NOT use VoIP or virtual numbers** (blocked aggressively)
- Limit message volume to realistic patterns
- Never run continuous bulk sends

---

## 7. OpenClaw Overview

OpenClaw is a managed AI assistant platform that uses Baileys. Provides:
- Multi-channel messaging gateway
- Built-in LLM integration
- Message inbox/queue system

### Why Direct Baileys is Better for This Project

| Aspect | Baileys Direct | OpenClaw |
|--------|----------------|----------|
| Code Control | Full control | Less control |
| Integration | Custom with Convex | May expect specific storage |
| Complexity | Medium | Lower |
| Flexibility | High | Medium |

---

## 8. Implementation Requirements

### Dependencies

```bash
# Core
npm install @whiskeysockets/baileys

# Optional
npm install link-preview-js  # URL previews
npm install pino             # Logging

# For Railway
npm install express          # Health check endpoint
npm install dotenv           # Environment variables
```

### Railway Deployment

**Advantages:**
- Persistent process (no cold starts)
- In-memory socket connection
- Automatic restarts on failure
- Built-in secret management

**Required:**

1. **Health Check Endpoint**
```javascript
app.get('/health', (req, res) => res.status(200).send('OK'));
```

2. **Graceful Shutdown**
```javascript
process.on('SIGTERM', async () => {
  // Close Baileys socket
  // Save state to Convex
  // Exit cleanly
});
```

3. **Environment Variables**
- `CONVEX_DEPLOYMENT_URL`
- `CONVEX_DEPLOYMENT_KEY`
- `LOG_LEVEL`

---

## 9. Architecture for This Project

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway Service                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  WhatsApp Adapter Service                             │  │
│  │  ┌─────────────┐    ┌──────────────┐                  │  │
│  │  │   Baileys   │───▶│ Event Handler│                  │  │
│  │  │   Socket    │    └──────┬───────┘                  │  │
│  │  └─────────────┘           │                          │  │
│  │         ▲                  ▼                          │  │
│  │         │           ┌──────────────┐                  │  │
│  │         │           │ Message Queue│                  │  │
│  │         │           └──────┬───────┘                  │  │
│  │         │                  │                          │  │
│  └─────────┼──────────────────┼──────────────────────────┘  │
│            │                  │                             │
└────────────┼──────────────────┼─────────────────────────────┘
             │                  │
             │                  ▼
             │           ┌──────────────┐
             │           │    Convex    │
             │           │  - Messages  │
             │           │  - Sessions  │
             │           │  - Patients  │
             │           └──────┬───────┘
             │                  │
             │                  ▼
             │           ┌──────────────┐
             └───────────│   Triage     │
                         │   Service    │
                         └──────────────┘
```

---

## 10. Key Implementation Steps

### Step 1: Create WhatsApp Adapter Service

```
/services/whatsapp-adapter/
├── src/
│   ├── index.ts           # Entry point, Express health check
│   ├── socket.ts          # Baileys socket management
│   ├── auth-state.ts      # Convex-based auth persistence
│   ├── message-handler.ts # Process incoming messages
│   └── sender.ts          # Outbound message interface
├── package.json
└── Dockerfile
```

### Step 2: Convex Auth State

Store auth credentials in Convex:
- `whatsappSessions` table
- Fields: `sessionId`, `credentials`, `lastConnected`
- Mutations: `saveCredentials`, `loadCredentials`

### Step 3: Message Flow

```
Incoming Message
    ↓
Baileys messages.upsert event
    ↓
Extract sender JID, content, media
    ↓
Store in Convex messages table
    ↓
Trigger triage service (separate task)
```

### Step 4: QR Code Display

Options:
1. Terminal output with `qrcode-terminal`
2. Web endpoint returning QR image
3. Store QR in Convex, display in dashboard

---

## 11. Risk Summary

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Account ban | **Critical** | Dedicated test number, limit volume |
| 24h disconnect | High | Reconnection logic with backoff |
| Credential leakage | High | Convex storage, never commit creds |
| Rate limiting | Medium | Queue with 1-2s delays |
| VoIP blocking | High | Use real mobile number |
| Connection loops | Medium | Max retry limits |

---

## 12. Next Steps

1. **Set up WhatsApp adapter service** (Task #2)
   - Create Railway service
   - Implement Baileys socket with Convex auth state
   - Add health check endpoint

2. **Connect test number** (Task #3)
   - Display QR code
   - Test bidirectional messaging

3. **Message intake pipeline** (Task #4)
   - Define Convex schema
   - Store incoming messages

---

## Sources

- [Baileys GitHub - Introduction](https://baileys.wiki/docs/intro/)
- [Baileys - Connecting](https://baileys.wiki/docs/socket/connecting/)
- [Baileys npm Package](https://www.npmjs.com/package/baileys)
- [OpenClaw WhatsApp Docs](https://docs.openclaw.ai/channels/whatsapp)
- [Railway Deploy Guide](https://docs.railway.com/guides/deploy-node-express-api)
- [Baileys Ban Issues #1869](https://github.com/WhiskeySockets/Baileys/issues/1869)
- [24h Timeout Issue #1625](https://github.com/WhiskeySockets/Baileys/issues/1625)
