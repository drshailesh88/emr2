# Deployment Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- Convex account (https://convex.dev)
- Razorpay account (for payments)
- WhatsApp Business API access (optional, for WhatsApp integration)

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
CONVEX_DEPLOY_KEY=your_convex_deploy_key

# Razorpay (Payments)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id  # Same as RAZORPAY_KEY_ID

# WhatsApp Adapter (optional)
NEXT_PUBLIC_WHATSAPP_ADAPTER_URL=http://localhost:3001
```

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Convex

```bash
# Initialize Convex (first time only)
npx convex init

# Deploy the schema and functions
npx convex deploy
```

### 3. Configure Razorpay

1. Create a Razorpay account at https://razorpay.com
2. Get your API keys from Dashboard > Settings > API Keys
3. Set up a webhook endpoint:
   - URL: `https://your-domain.com/api/payments/webhook`
   - Events: `payment.captured`, `payment.authorized`, `payment.failed`, `order.paid`
4. Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`

### 4. Run Development Server

```bash
# Start Next.js
npm run dev

# In a separate terminal, start Convex
npm run convex
```

### 5. Production Deployment

#### Railway (Recommended)

1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Deploy

#### Vercel

1. Connect repository to Vercel
2. Add environment variables
3. Deploy

Note: For WhatsApp integration, you'll need a separate service (Railway is better suited for long-running connections).

## WhatsApp Adapter Setup (Optional)

The WhatsApp adapter is a separate Node.js service that maintains the WhatsApp connection:

```bash
cd services/whatsapp-adapter
npm install
npm start
```

This will:
1. Generate a QR code for WhatsApp Web authentication
2. Scan with your clinic WhatsApp number
3. Start receiving/sending messages

## Convex Schema Deployment

After any schema changes, deploy to Convex:

```bash
npm run convex:deploy
```

## Health Checks

- Convex: Visit your Convex dashboard
- API: `GET /api/health` (if implemented)
- WhatsApp: Check adapter logs for connection status

## Troubleshooting

### Convex Connection Issues
- Verify `NEXT_PUBLIC_CONVEX_URL` is correct
- Check Convex dashboard for deployment status

### Payment Webhook Not Receiving Events
- Verify webhook URL is publicly accessible
- Check Razorpay dashboard for webhook delivery status
- Ensure `RAZORPAY_WEBHOOK_SECRET` matches

### WhatsApp Disconnects
- WhatsApp Web sessions expire periodically
- Re-scan QR code when disconnected
- Consider implementing session persistence
