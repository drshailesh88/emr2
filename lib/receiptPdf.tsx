import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register fonts
Font.register({
  family: "Noto Sans",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@4.5.0/files/noto-sans-latin-400-normal.woff",
      fontWeight: "normal",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@4.5.0/files/noto-sans-latin-700-normal.woff",
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Noto Sans",
    fontSize: 10,
    padding: 40,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#1a365d",
  },
  clinicInfo: {
    flex: 1,
  },
  clinicName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a365d",
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
  },
  clinicAddress: {
    fontSize: 9,
    color: "#666666",
    marginBottom: 1,
  },
  receiptTitle: {
    textAlign: "right",
  },
  receiptText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a365d",
    marginBottom: 4,
  },
  receiptNumber: {
    fontSize: 10,
    color: "#666666",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1a365d",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    color: "#666666",
    width: "40%",
  },
  value: {
    fontSize: 10,
    fontWeight: "bold",
    width: "60%",
  },
  amountBox: {
    backgroundColor: "#f0fdf4",
    padding: 15,
    borderRadius: 4,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#86efac",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 12,
    color: "#166534",
  },
  amountValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#166534",
  },
  paidStamp: {
    position: "absolute",
    top: 150,
    right: 40,
    transform: "rotate(-15deg)",
    borderWidth: 3,
    borderColor: "#22c55e",
    borderRadius: 4,
    padding: "8 15",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  paidText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#22c55e",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 2,
  },
  paymentDetails: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 4,
    marginTop: 10,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 9,
    color: "#64748b",
  },
  paymentValue: {
    fontSize: 9,
    color: "#334155",
  },
});

export interface ReceiptPdfProps {
  receiptNumber: string;
  date: string;
  // Doctor/Clinic info
  doctorName: string;
  doctorQualification?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  // Patient info
  patientName: string;
  patientPhone?: string;
  // Payment info
  amount: number; // in rupees
  paymentMethod?: string;
  transactionId?: string;
  razorpayPaymentId?: string;
  // Service info
  serviceDescription?: string;
  appointmentDate?: string;
}

export function ReceiptPdf({
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
}: ReceiptPdfProps) {
  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amt);
  };

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.clinicInfo}>
            {clinicName && <Text style={styles.clinicName}>{clinicName}</Text>}
            <Text style={styles.doctorName}>{doctorName}</Text>
            {doctorQualification && (
              <Text style={styles.clinicAddress}>{doctorQualification}</Text>
            )}
            {clinicAddress && (
              <Text style={styles.clinicAddress}>{clinicAddress}</Text>
            )}
            {clinicPhone && (
              <Text style={styles.clinicAddress}>Tel: {clinicPhone}</Text>
            )}
          </View>
          <View style={styles.receiptTitle}>
            <Text style={styles.receiptText}>RECEIPT</Text>
            <Text style={styles.receiptNumber}>#{receiptNumber}</Text>
            <Text style={styles.receiptNumber}>{date}</Text>
          </View>
        </View>

        {/* Paid Stamp */}
        <View style={styles.paidStamp}>
          <Text style={styles.paidText}>PAID</Text>
        </View>

        {/* Patient Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{patientName}</Text>
          </View>
          {patientPhone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{patientPhone}</Text>
            </View>
          )}
        </View>

        {/* Service Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Description:</Text>
            <Text style={styles.value}>
              {serviceDescription || "Consultation Fee"}
            </Text>
          </View>
          {appointmentDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Appointment Date:</Text>
              <Text style={styles.value}>{appointmentDate}</Text>
            </View>
          )}
        </View>

        {/* Amount Box */}
        <View style={styles.amountBox}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Amount Paid</Text>
            <Text style={styles.amountValue}>{formatAmount(amount)}</Text>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.paymentDetails}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method:</Text>
            <Text style={styles.paymentValue}>
              {paymentMethod || "Online Payment"}
            </Text>
          </View>
          {transactionId && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Transaction ID:</Text>
              <Text style={styles.paymentValue}>{transactionId}</Text>
            </View>
          )}
          {razorpayPaymentId && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Razorpay ID:</Text>
              <Text style={styles.paymentValue}>{razorpayPaymentId}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is a computer-generated receipt and does not require a signature.
          </Text>
          <Text style={styles.footerText}>
            Thank you for choosing our services.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// Helper function to render PDF to buffer
export async function renderReceiptPdfToBuffer(
  props: ReceiptPdfProps
): Promise<Uint8Array> {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(<ReceiptPdf {...props} />).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// Generate receipt number
export function generateReceiptNumber(
  paymentId: string,
  timestamp: number
): string {
  const date = new Date(timestamp);
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const shortId = paymentId.slice(-6).toUpperCase();
  return `RCP-${year}${month}-${shortId}`;
}
