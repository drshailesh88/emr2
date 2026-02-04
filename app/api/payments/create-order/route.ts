import { NextRequest, NextResponse } from "next/server";
import { createOrder, rupeesToPaise } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, appointmentId, patientName, doctorName } = body;

    if (!amount || !appointmentId) {
      return NextResponse.json(
        { error: "Amount and appointmentId are required" },
        { status: 400 }
      );
    }

    // Create Razorpay order
    const order = await createOrder({
      amount: rupeesToPaise(amount), // Convert rupees to paise
      receipt: `appt_${appointmentId}_${Date.now()}`,
      notes: {
        appointmentId,
        patientName: patientName || "",
        doctorName: doctorName || "",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}
