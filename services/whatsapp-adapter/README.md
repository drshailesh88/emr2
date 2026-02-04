# WhatsApp Adapter Service

⚠️ **INTERNAL TESTING ONLY** - This service uses unofficial WhatsApp libraries that violate WhatsApp's Terms of Service. Do not use in production without official WhatsApp Business API.

## Overview

This service connects to WhatsApp using the Baileys library and provides:
- QR code authentication
- Session persistence via Convex
- Message sending/receiving
- Reconnection handling

## Setup

### 1. Install Dependencies

```bash
cd services/whatsapp-adapter
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:
- `CONVEX_URL` - Your Convex deployment URL
- `CONVEX_DEPLOY_KEY` - Convex deploy key for mutations

### 3. Deploy Convex Schema

Make sure the WhatsApp-related tables are deployed to Convex:

```bash
cd ../..  # Back to project root
npx convex deploy
```

### 4. Run Locally

```bash
npm run dev
```

The service will:
1. Start Express server on port 3001
2. Attempt to connect to WhatsApp
3. Display QR code in terminal (also available at `/qr`)

### 5. Scan QR Code

Open WhatsApp on your phone:
1. Go to Settings > Linked Devices
2. Tap "Link a Device"
3. Scan the QR code displayed in terminal or at `http://localhost:3001/qr`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check for Railway |
| `/status` | GET | Connection status |
| `/qr` | GET | QR code as base64 image |
| `/qr/raw` | GET | QR code as raw string |
| `/send` | POST | Send test message |

### Send Message Example

```bash
curl -X POST http://localhost:3001/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "919876543210", "message": "Hello from adapter!"}'
```

## Railway Deployment

1. Create a new Railway service
2. Connect to your GitHub repo
3. Set the root directory to `services/whatsapp-adapter`
4. Add environment variables in Railway dashboard
5. Deploy

The service will:
- Start and display QR code
- Persist session to Convex
- Reconnect automatically on disconnect

## Architecture

```
┌─────────────────────────────────────────┐
│          WhatsApp Adapter               │
│  ┌─────────────┐    ┌───────────────┐   │
│  │   Express   │    │    Baileys    │   │
│  │   Server    │    │    Socket     │   │
│  └─────────────┘    └───────┬───────┘   │
│         │                   │           │
└─────────┼───────────────────┼───────────┘
          │                   │
          ▼                   ▼
    ┌──────────┐        ┌──────────┐
    │  Health  │        │  Convex  │
    │  Checks  │        │ Sessions │
    └──────────┘        └──────────┘
```

## Important Notes

1. **One Phone Number Per Session** - Each session ID must use a unique phone number
2. **24-Hour Timeout** - WhatsApp disconnects sessions after ~24 hours; the service handles reconnection automatically
3. **Rate Limits** - Keep message sending to 1-2 per second to avoid bans
4. **Account Risk** - Using unofficial APIs may result in WhatsApp account bans
5. **Testing Only** - This is for internal development/testing, not production use
