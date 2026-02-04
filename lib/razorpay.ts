/**
 * Razorpay Configuration and Utilities
 *
 * Environment variables required:
 * - RAZORPAY_KEY_ID: Razorpay API Key ID
 * - RAZORPAY_KEY_SECRET: Razorpay API Key Secret
 * - RAZORPAY_WEBHOOK_SECRET: Webhook signature verification secret
 */

import Razorpay from "razorpay";
import crypto from "crypto";

// Razorpay instance (server-side only)
let razorpayInstance: Razorpay | null = null;

export function getRazorpayInstance(): Razorpay {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Razorpay API keys not configured");
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayInstance;
}

// Get public key for client-side
export function getRazorpayKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new Error("Razorpay key ID not configured");
  }
  return keyId;
}

// Verify webhook signature
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Razorpay webhook secret not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Verify payment signature (for checkout callback)
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error("Razorpay key secret not configured");
  }

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

// Order creation options
export interface CreateOrderOptions {
  amount: number; // Amount in paise (100 = ₹1)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

// Create a Razorpay order
export async function createOrder(options: CreateOrderOptions) {
  const razorpay = getRazorpayInstance();

  const order = await razorpay.orders.create({
    amount: options.amount,
    currency: options.currency || "INR",
    receipt: options.receipt,
    notes: options.notes,
  });

  return order;
}

// Payment link options
export interface CreatePaymentLinkOptions {
  amount: number; // Amount in paise
  currency?: string;
  description: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  receipt?: string;
  notes?: Record<string, string>;
  callbackUrl?: string;
  expireBy?: number; // Unix timestamp
}

// Create a payment link (for UPI/QR)
export async function createPaymentLink(options: CreatePaymentLinkOptions) {
  const razorpay = getRazorpayInstance();

  const paymentLink = await razorpay.paymentLink.create({
    amount: options.amount,
    currency: options.currency || "INR",
    description: options.description,
    customer: {
      name: options.customerName,
      contact: options.customerPhone,
      email: options.customerEmail,
    },
    notify: {
      sms: true,
      email: !!options.customerEmail,
    },
    callback_url: options.callbackUrl,
    callback_method: "get",
    expire_by: options.expireBy,
    notes: options.notes,
  });

  return paymentLink;
}

// Fetch payment details
export async function fetchPayment(paymentId: string) {
  const razorpay = getRazorpayInstance();
  return await razorpay.payments.fetch(paymentId);
}

// Fetch order details
export async function fetchOrder(orderId: string) {
  const razorpay = getRazorpayInstance();
  return await razorpay.orders.fetch(orderId);
}

// Format amount for display
export function formatAmount(amountInPaise: number): string {
  const rupees = amountInPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(rupees);
}

// Convert rupees to paise
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

// Convert paise to rupees
export function paiseToRupees(paise: number): number {
  return paise / 100;
}
