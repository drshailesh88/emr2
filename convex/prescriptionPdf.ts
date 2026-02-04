import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Generate Hindi instruction from English (rules-based)
function generateHindiInstruction(
  frequency: string,
  duration: string,
  instructions?: string
): string {
  // Frequency translations
  const frequencyMap: Record<string, string> = {
    OD: "दिन में एक बार",
    BD: "दिन में दो बार",
    TDS: "दिन में तीन बार",
    QID: "दिन में चार बार",
    HS: "रात को सोने से पहले",
    SOS: "जरूरत पड़ने पर",
  };

  // Instruction translations
  const instructionMap: Record<string, string> = {
    "after food": "खाना खाने के बाद",
    "before food": "खाना खाने से पहले",
    "empty stomach": "खाली पेट",
    "with water": "पानी के साथ",
    "with milk": "दूध के साथ",
    morning: "सुबह",
    evening: "शाम को",
    "at night": "रात को",
  };

  // Duration translations
  const durationPatterns: Array<[RegExp, string]> = [
    [/(\d+)\s*days?/i, "$1 दिन"],
    [/(\d+)\s*weeks?/i, "$1 सप्ताह"],
    [/(\d+)\s*months?/i, "$1 महीने"],
    [/continue/i, "जारी रखें"],
    [/lifelong/i, "जीवन भर"],
  ];

  let hindiParts: string[] = [];

  // Add frequency
  const freqHindi = frequencyMap[frequency.toUpperCase()] || frequency;
  hindiParts.push(freqHindi);

  // Add duration
  let durationHindi = duration;
  for (const [pattern, replacement] of durationPatterns) {
    durationHindi = durationHindi.replace(pattern, replacement);
  }
  hindiParts.push(durationHindi);

  // Add instructions
  if (instructions) {
    let instructionsHindi = instructions.toLowerCase();
    for (const [eng, hindi] of Object.entries(instructionMap)) {
      instructionsHindi = instructionsHindi.replace(
        new RegExp(eng, "gi"),
        hindi
      );
    }
    hindiParts.push(`(${instructionsHindi})`);
  }

  return hindiParts.join(" - ");
}

// Store PDF file ID to prescription
export const storePdfFileId = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.prescriptionId, {
      pdfFileId: args.fileId,
    });
  },
});

// Get prescription with all related data for PDF generation
export const getPrescriptionForPdf = query({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args) => {
    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) return null;

    const [doctor, patient] = await Promise.all([
      ctx.db.get(prescription.doctorId),
      ctx.db.get(prescription.patientId),
    ]);

    if (!doctor || !patient) return null;

    // Generate Hindi instructions for medications
    const medicationsWithHindi = prescription.medications.map((med) => ({
      ...med,
      instructionsHindi:
        med.instructionsHindi ||
        generateHindiInstruction(med.frequency, med.duration, med.instructions),
    }));

    return {
      prescription: {
        ...prescription,
        medications: medicationsWithHindi,
      },
      doctor,
      patient,
    };
  },
});

// Get PDF URL for a prescription
export const getPdfUrl = query({
  args: {
    prescriptionId: v.id("prescriptions"),
  },
  handler: async (ctx, args) => {
    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription || !prescription.pdfFileId) return null;

    return await ctx.storage.getUrl(prescription.pdfFileId);
  },
});

// Generate upload URL for PDF
export const generatePdfUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Mark prescription as sent via channel
export const markAsSent = mutation({
  args: {
    prescriptionId: v.id("prescriptions"),
    channel: v.string(), // "whatsapp" | "email"
  },
  handler: async (ctx, args) => {
    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) {
      throw new Error("Prescription not found");
    }

    const existingChannels = prescription.sentVia || [];
    const newChannels = existingChannels.includes(args.channel)
      ? existingChannels
      : [...existingChannels, args.channel];

    await ctx.db.patch(args.prescriptionId, {
      sentVia: newChannels,
      sentAt: Date.now(),
    });
  },
});

// Get prescription history for a patient
export const getHistory = query({
  args: {
    patientId: v.id("patients"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const prescriptions = await ctx.db
      .query("prescriptions")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(limit);

    // Get PDF URLs for prescriptions that have PDFs
    const prescriptionsWithUrls = await Promise.all(
      prescriptions.map(async (rx) => {
        const pdfUrl = rx.pdfFileId
          ? await ctx.storage.getUrl(rx.pdfFileId)
          : null;
        return { ...rx, pdfUrl };
      })
    );

    return prescriptionsWithUrls;
  },
});

// Add this query to get prescription templates
export const getTemplates = query({
  args: {},
  handler: async () => {
    // Return predefined templates (could be stored in DB for customization)
    return [
      {
        id: "hypertension-new",
        name: "New Hypertension",
        diagnosis: "Essential Hypertension",
        medications: [
          {
            name: "Amlodipine",
            dosage: "5mg",
            frequency: "OD",
            duration: "1 month",
            instructions: "Morning",
          },
        ],
        investigations: ["CBC", "RFT", "Lipid Profile", "ECG"],
        specialInstructions:
          "Low salt diet, Regular exercise, Monitor BP daily",
        followUp: "After 2 weeks",
      },
      {
        id: "hypertension-uncontrolled",
        name: "Uncontrolled Hypertension",
        diagnosis: "Uncontrolled Essential Hypertension",
        medications: [
          {
            name: "Telmisartan",
            dosage: "40mg",
            frequency: "OD",
            duration: "1 month",
            instructions: "Morning",
          },
          {
            name: "Amlodipine",
            dosage: "5mg",
            frequency: "OD",
            duration: "1 month",
            instructions: "Morning",
          },
        ],
        investigations: ["RFT", "Serum Electrolytes"],
        specialInstructions: "Low salt diet, Regular BP monitoring",
        followUp: "After 2 weeks",
      },
      {
        id: "stable-angina",
        name: "Stable Angina",
        diagnosis: "Stable Angina Pectoris",
        medications: [
          {
            name: "Aspirin",
            dosage: "75mg",
            frequency: "OD",
            duration: "Continue",
            instructions: "After food",
          },
          {
            name: "Atorvastatin",
            dosage: "40mg",
            frequency: "HS",
            duration: "Continue",
            instructions: "At night",
          },
          {
            name: "Metoprolol",
            dosage: "50mg",
            frequency: "BD",
            duration: "Continue",
            instructions: "",
          },
          {
            name: "Isosorbide Mononitrate",
            dosage: "30mg",
            frequency: "OD",
            duration: "Continue",
            instructions: "Morning",
          },
        ],
        investigations: ["ECG", "2D Echo", "TMT"],
        specialInstructions: "Avoid exertion, SOS Sorbitrate if chest pain",
        followUp: "After 1 month",
      },
      {
        id: "post-mi",
        name: "Post-MI Follow-up",
        diagnosis: "Post Myocardial Infarction",
        medications: [
          {
            name: "Aspirin",
            dosage: "75mg",
            frequency: "OD",
            duration: "Lifelong",
            instructions: "After food",
          },
          {
            name: "Clopidogrel",
            dosage: "75mg",
            frequency: "OD",
            duration: "1 year",
            instructions: "After food",
          },
          {
            name: "Atorvastatin",
            dosage: "80mg",
            frequency: "HS",
            duration: "Lifelong",
            instructions: "",
          },
          {
            name: "Metoprolol",
            dosage: "50mg",
            frequency: "BD",
            duration: "Continue",
            instructions: "",
          },
          {
            name: "Ramipril",
            dosage: "5mg",
            frequency: "OD",
            duration: "Continue",
            instructions: "",
          },
        ],
        investigations: ["2D Echo in 3 months"],
        specialInstructions: "Cardiac rehabilitation, Lifestyle modification",
        followUp: "After 1 month",
      },
      {
        id: "heart-failure",
        name: "Heart Failure",
        diagnosis: "Congestive Heart Failure",
        medications: [
          {
            name: "Furosemide",
            dosage: "40mg",
            frequency: "OD",
            duration: "Continue",
            instructions: "Morning",
          },
          {
            name: "Spironolactone",
            dosage: "25mg",
            frequency: "OD",
            duration: "Continue",
            instructions: "",
          },
          {
            name: "Ramipril",
            dosage: "5mg",
            frequency: "OD",
            duration: "Continue",
            instructions: "",
          },
          {
            name: "Metoprolol",
            dosage: "25mg",
            frequency: "BD",
            duration: "Continue",
            instructions: "",
          },
        ],
        investigations: ["BNP", "RFT", "Serum Electrolytes", "2D Echo"],
        specialInstructions:
          "Fluid restriction 1.5L/day, Daily weight monitoring, Low salt diet",
        followUp: "After 2 weeks",
      },
    ];
  },
});
