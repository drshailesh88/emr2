import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.error("Invalid Razorpay webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    console.log("Razorpay webhook event:", eventType);

    switch (eventType) {
      case "payment.captured":
      case "payment.authorized": {
        const payment = event.payload.payment.entity;
        const orderId = payment.order_id;
        const paymentId = payment.id;

        // Find payment record by Razorpay order ID
        const paymentRecord = await convex.query(
          api.payments.getByRazorpayOrderId,
          { razorpayOrderId: orderId }
        );

        if (paymentRecord) {
          // Mark payment as completed
          await convex.mutation(api.payments.markCompleted, {
            paymentId: paymentRecord._id,
            razorpayPaymentId: paymentId,
          });
          console.log("Payment completed:", paymentId);
        } else {
          console.warn("Payment record not found for order:", orderId);
        }
        break;
      }

      case "payment.failed": {
        const payment = event.payload.payment.entity;
        const orderId = payment.order_id;
        const errorReason = payment.error_description || "Payment failed";

        // Find payment record by Razorpay order ID
        const paymentRecord = await convex.query(
          api.payments.getByRazorpayOrderId,
          { razorpayOrderId: orderId }
        );

        if (paymentRecord) {
          // Mark payment as failed
          await convex.mutation(api.payments.markFailed, {
            paymentId: paymentRecord._id,
            error: errorReason,
          });
          console.log("Payment failed:", orderId, errorReason);
        }
        break;
      }

      case "order.paid": {
        const order = event.payload.order.entity;
        console.log("Order paid:", order.id);
        // Order paid events are handled by payment.captured
        break;
      }

      default:
        console.log("Unhandled webhook event:", eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
