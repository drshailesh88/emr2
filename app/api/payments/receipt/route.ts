import { NextRequest, NextResponse } from "next/server";
import { renderReceiptPdfToBuffer, generateReceiptNumber } from "@/lib/receiptPdf";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      paymentId,
      timestamp,
      doctorName,
      doctorQualification,
      clinicName,
      clinicAddress,
      clinicPhone,
      patientName,
      patientPhone,
      amount, // in rupees
      paymentMethod,
      transactionId,
      razorpayPaymentId,
      serviceDescription,
      appointmentDate,
    } = body;

    if (!paymentId || !doctorName || !patientName || !amount) {
      return NextResponse.json(
        { error: "paymentId, doctorName, patientName, and amount are required" },
        { status: 400 }
      );
    }

    const receiptNumber = generateReceiptNumber(paymentId, timestamp || Date.now());
    const date = new Date(timestamp || Date.now()).toLocaleDateString("en-IN", {
      dateStyle: "long",
    });

    // Generate PDF
    const pdfBuffer = await renderReceiptPdfToBuffer({
      receiptNumber,
      date,
      doctorName,
      doctorQualification,
      clinicName,
      clinicAddress,
      clinicPhone,
      patientName,
      patientPhone,
      amount,
      paymentMethod,
      transactionId,
      razorpayPaymentId,
      serviceDescription,
      appointmentDate,
    });

    // Return PDF as response
    return new Response(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${receiptNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating receipt:", error);
    return NextResponse.json(
      { error: "Failed to generate receipt" },
      { status: 500 }
    );
  }
}
