import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { generateFullHindiInstruction } from "./medications";

// Register fonts for Hindi support
// Note: In production, you would register actual Hindi fonts
// Font.register({
//   family: "NotoSansDevanagari",
//   src: "/fonts/NotoSansDevanagari-Regular.ttf",
// });

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#333",
    paddingBottom: 15,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  qualifications: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
  },
  specialty: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
  },
  clinicName: {
    fontSize: 10,
    marginBottom: 2,
  },
  clinicAddress: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
  regNumber: {
    fontSize: 9,
    color: "#666",
  },
  patientInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  patientInfoItem: {
    flex: 1,
  },
  label: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  sectionContent: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  rxSymbol: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  medicationTable: {
    marginBottom: 15,
  },
  medicationHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  medicationHeaderText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#333",
  },
  medicationRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  medCol1: { flex: 2 },
  medCol2: { flex: 1 },
  medCol3: { flex: 1 },
  medCol4: { flex: 1 },
  medCol5: { flex: 2 },
  medicationName: {
    fontSize: 10,
    fontWeight: "bold",
  },
  medicationDosage: {
    fontSize: 9,
    color: "#666",
  },
  medicationDetail: {
    fontSize: 9,
  },
  hindiText: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
    // fontFamily: "NotoSansDevanagari", // Enable when font is registered
  },
  investigationsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  investigationItem: {
    backgroundColor: "#f0f0f0",
    padding: "4 8",
    borderRadius: 4,
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 15,
  },
  signature: {
    textAlign: "right",
  },
  signatureLine: {
    width: 150,
    borderTopWidth: 1,
    borderTopColor: "#333",
    marginBottom: 5,
  },
  signatureText: {
    fontSize: 10,
  },
  followUp: {
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
  },
  followUpText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  qrCode: {
    width: 60,
    height: 60,
  },
  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-45deg)",
    fontSize: 60,
    color: "#f0f0f0",
    opacity: 0.3,
  },
});

// Types
interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  instructionsHindi?: string;
}

interface Doctor {
  name: string;
  qualifications: string;
  specialty: string;
  clinicName: string;
  clinicAddress: string;
  registrationNumber: string;
  phone?: string;
}

interface Patient {
  name: string;
  age?: number;
  sex?: string;
  phone?: string;
}

interface PrescriptionPdfProps {
  doctor: Doctor;
  patient: Patient;
  date: string;
  chiefComplaints?: string;
  diagnosis?: string;
  medications: Medication[];
  investigations?: string[];
  specialInstructions?: string;
  followUp?: string;
  prescriptionNumber?: string;
}

export function PrescriptionPdf({
  doctor,
  patient,
  date,
  chiefComplaints,
  diagnosis,
  medications,
  investigations,
  specialInstructions,
  followUp,
  prescriptionNumber,
}: PrescriptionPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header - Doctor Info */}
        <View style={styles.header}>
          <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
          <Text style={styles.qualifications}>{doctor.qualifications}</Text>
          <Text style={styles.specialty}>{doctor.specialty}</Text>
          <Text style={styles.clinicName}>{doctor.clinicName}</Text>
          <Text style={styles.clinicAddress}>{doctor.clinicAddress}</Text>
          <Text style={styles.regNumber}>Reg. No: {doctor.registrationNumber}</Text>
        </View>

        {/* Patient Info Row */}
        <View style={styles.patientInfo}>
          <View style={styles.patientInfoItem}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
          <View style={styles.patientInfoItem}>
            <Text style={styles.label}>Patient Name</Text>
            <Text style={styles.value}>{patient.name}</Text>
          </View>
          <View style={styles.patientInfoItem}>
            <Text style={styles.label}>Age / Sex</Text>
            <Text style={styles.value}>
              {patient.age ?? "--"} / {patient.sex ?? "--"}
            </Text>
          </View>
          {prescriptionNumber && (
            <View style={styles.patientInfoItem}>
              <Text style={styles.label}>Rx No.</Text>
              <Text style={styles.value}>{prescriptionNumber}</Text>
            </View>
          )}
        </View>

        {/* Chief Complaints */}
        {chiefComplaints && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chief Complaints:</Text>
            <Text style={styles.sectionContent}>{chiefComplaints}</Text>
          </View>
        )}

        {/* Diagnosis */}
        {diagnosis && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diagnosis:</Text>
            <Text style={styles.sectionContent}>{diagnosis}</Text>
          </View>
        )}

        {/* Medications */}
        <View style={styles.section}>
          <Text style={styles.rxSymbol}>℞</Text>

          <View style={styles.medicationTable}>
            {/* Header */}
            <View style={styles.medicationHeader}>
              <View style={styles.medCol1}>
                <Text style={styles.medicationHeaderText}>Medicine</Text>
              </View>
              <View style={styles.medCol2}>
                <Text style={styles.medicationHeaderText}>Dosage</Text>
              </View>
              <View style={styles.medCol3}>
                <Text style={styles.medicationHeaderText}>Frequency</Text>
              </View>
              <View style={styles.medCol4}>
                <Text style={styles.medicationHeaderText}>Duration</Text>
              </View>
              <View style={styles.medCol5}>
                <Text style={styles.medicationHeaderText}>Instructions</Text>
              </View>
            </View>

            {/* Medication Rows */}
            {medications.map((med, index) => {
              // Generate Hindi instruction if not provided
              const hindiInstruction =
                med.instructionsHindi ||
                generateFullHindiInstruction(
                  med.name,
                  med.dosage,
                  med.frequency,
                  med.duration,
                  med.instructions
                );

              return (
                <View key={index} style={styles.medicationRow}>
                  <View style={styles.medCol1}>
                    <Text style={styles.medicationName}>
                      {index + 1}. {med.name}
                    </Text>
                  </View>
                  <View style={styles.medCol2}>
                    <Text style={styles.medicationDetail}>{med.dosage}</Text>
                  </View>
                  <View style={styles.medCol3}>
                    <Text style={styles.medicationDetail}>{med.frequency}</Text>
                  </View>
                  <View style={styles.medCol4}>
                    <Text style={styles.medicationDetail}>{med.duration}</Text>
                  </View>
                  <View style={styles.medCol5}>
                    <Text style={styles.medicationDetail}>
                      {med.instructions || "-"}
                    </Text>
                    <Text style={styles.hindiText}>{hindiInstruction}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Investigations */}
        {investigations && investigations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Investigations Advised:</Text>
            <View style={styles.investigationsList}>
              {investigations.map((inv, index) => (
                <Text key={index} style={styles.investigationItem}>
                  {inv}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Special Instructions */}
        {specialInstructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions:</Text>
            <Text style={styles.sectionContent}>{specialInstructions}</Text>
          </View>
        )}

        {/* Follow-up */}
        {followUp && (
          <View style={styles.followUp}>
            <Text style={styles.followUpText}>Follow-up: {followUp}</Text>
          </View>
        )}

        {/* Footer with Signature */}
        <View style={styles.footer}>
          <View>
            <Text style={{ fontSize: 8, color: "#666" }}>
              This prescription is valid for 30 days from date of issue.
            </Text>
          </View>
          <View style={styles.signature}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>Dr. {doctor.name}</Text>
            <Text style={{ fontSize: 8, color: "#666" }}>
              {doctor.registrationNumber}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// Helper function to render PDF to blob (for client-side)
export async function renderPrescriptionPdfToBlob(
  props: PrescriptionPdfProps
): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(<PrescriptionPdf {...props} />).toBlob();
  return blob;
}

// Helper function to render PDF to buffer (for server-side)
export async function renderPrescriptionPdfToBuffer(
  props: PrescriptionPdfProps
): Promise<Uint8Array> {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(<PrescriptionPdf {...props} />).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
