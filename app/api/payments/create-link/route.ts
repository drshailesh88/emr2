import { NextRequest, NextResponse } from "next/server";
import { createPaymentLink, rupeesToPaise } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amount,
      appointmentId,
      patientName,
      patientPhone,
      patientEmail,
      doctorName,
      description,
      expireInHours,
    } = body;

    if (!amount || !patientPhone || !patientName) {
      return NextResponse.json(
        { error: "Amount, patientPhone, and patientName are required" },
        { status: 400 }
      );
    }

    // Create payment link
    const paymentLink = await createPaymentLink({
      amount: rupeesToPaise(amount),
      description: description || `Consultation fee for Dr. ${doctorName || "Doctor"}`,
      customerName: patientName,
      customerPhone: patientPhone,
      customerEmail: patientEmail,
      receipt: appointmentId ? `appt_${appointmentId}_${Date.now()}` : undefined,
      notes: {
        appointmentId: appointmentId || "",
        patientName,
        doctorName: doctorName || "",
      },
      expireBy: expireInHours
        ? Math.floor(Date.now() / 1000) + expireInHours * 3600
        : undefined,
    });

    return NextResponse.json({
      linkId: paymentLink.id,
      shortUrl: paymentLink.short_url,
      amount: paymentLink.amount,
      currency: paymentLink.currency,
      status: paymentLink.status,
      expireBy: paymentLink.expire_by,
    });
  } catch (error) {
    console.error("Error creating payment link:", error);
    return NextResponse.json(
      { error: "Failed to create payment link" },
      { status: 500 }
    );
  }
}
