/**
 * Appointment Request Handler
 *
 * Handles appointment-related message intents:
 * - Booking new appointments
 * - Rescheduling existing appointments
 * - Cancelling appointments
 *
 * Uses rules-first for intent detection, LLM for response drafting.
 */

import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Appointment intent keywords
const APPOINTMENT_KEYWORDS = {
  book: {
    english: [
      "appointment",
      "book appointment",
      "schedule appointment",
      "schedule a",
      "want to see doctor",
      "need to see doctor",
      "see the doctor",
      "need appointment",
      "booking",
      "visit doctor",
      "check up",
      "checkup",
      "when can i come",
      "want to come",
      "available slot",
      "book for",
      "doctor available",
      "is available",
    ],
    hindiTranslit: [
      "appointment",
      "milna hai",
      "milna chahte",
      "doctor se milna",
      "aana hai",
      "kab aa sakta",
      "kab aa sakti",
      "checkup",
      "time chahiye",
      "slot chahiye",
    ],
    devanagari: [
      "अपॉइंटमेंट",
      "मिलना है",
      "डॉक्टर से मिलना",
      "आना है",
      "कब आ सकता",
      "कब आ सकती",
      "चेकअप",
    ],
  },
  reschedule: {
    english: [
      "reschedule",
      "change appointment",
      "change time",
      "change the time",
      "different time",
      "postpone",
      "prepone",
      "shift appointment",
      "move appointment",
    ],
    hindiTranslit: [
      "badalna hai",
      "time badalna",
      "reschedule",
      "alag time",
    ],
    devanagari: [
      "बदलना है",
      "टाइम बदलना",
      "अलग टाइम",
    ],
  },
  cancel: {
    english: [
      "cancel appointment",
      "cancel my appointment",
      "cannot come",
      "can't come",
      "won't be able",
      "not coming",
      "cancel",
    ],
    hindiTranslit: [
      "cancel",
      "nahi aa sakta",
      "nahi aa sakti",
      "nahi aaunga",
      "nahi aaungi",
    ],
    devanagari: [
      "कैंसल",
      "नहीं आ सकता",
      "नहीं आ सकती",
      "नहीं आऊंगा",
      "नहीं आऊंगी",
    ],
  },
};

// Time-related keywords for extraction
const TIME_KEYWORDS = {
  today: ["today", "aaj", "आज", "abhi"],
  tomorrow: ["tomorrow", "kal", "कल"],
  dayAfter: ["day after tomorrow", "parso", "परसों"],
  morning: ["morning", "subah", "सुबह", "am"],
  afternoon: ["afternoon", "dopahar", "दोपहर"],
  evening: ["evening", "shaam", "शाम", "sham"],
  night: ["night", "raat", "रात"],
};

/**
 * Detect if a message is about appointments and what type
 */
export function detectAppointmentIntent(text: string): {
  isAppointmentRelated: boolean;
  intent: "book" | "reschedule" | "cancel" | null;
  confidence: "high" | "medium" | "low";
  matchedKeywords: string[];
} {
  const normalizedText = text.toLowerCase().trim();
  const matchedKeywords: string[] = [];
  let intent: "book" | "reschedule" | "cancel" | null = null;

  // Check cancellation first (more specific)
  for (const kw of [
    ...APPOINTMENT_KEYWORDS.cancel.english,
    ...APPOINTMENT_KEYWORDS.cancel.hindiTranslit,
  ]) {
    if (normalizedText.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
      intent = "cancel";
    }
  }
  // Check original text for Devanagari
  for (const kw of APPOINTMENT_KEYWORDS.cancel.devanagari) {
    if (text.includes(kw)) {
      matchedKeywords.push(kw);
      intent = "cancel";
    }
  }

  // Check reschedule
  if (!intent) {
    for (const kw of [
      ...APPOINTMENT_KEYWORDS.reschedule.english,
      ...APPOINTMENT_KEYWORDS.reschedule.hindiTranslit,
    ]) {
      if (normalizedText.includes(kw.toLowerCase())) {
        matchedKeywords.push(kw);
        intent = "reschedule";
      }
    }
    for (const kw of APPOINTMENT_KEYWORDS.reschedule.devanagari) {
      if (text.includes(kw)) {
        matchedKeywords.push(kw);
        intent = "reschedule";
      }
    }
  }

  // Check booking (most general)
  if (!intent) {
    for (const kw of [
      ...APPOINTMENT_KEYWORDS.book.english,
      ...APPOINTMENT_KEYWORDS.book.hindiTranslit,
    ]) {
      if (normalizedText.includes(kw.toLowerCase())) {
        matchedKeywords.push(kw);
        intent = "book";
      }
    }
    for (const kw of APPOINTMENT_KEYWORDS.book.devanagari) {
      if (text.includes(kw)) {
        matchedKeywords.push(kw);
        intent = "book";
      }
    }
  }

  // Determine confidence
  let confidence: "high" | "medium" | "low" = "low";
  if (matchedKeywords.length >= 2) {
    confidence = "high";
  } else if (matchedKeywords.length === 1) {
    confidence = "medium";
  }

  return {
    isAppointmentRelated: intent !== null,
    intent,
    confidence,
    matchedKeywords,
  };
}

/**
 * Extract time preferences from message text
 */
export function extractTimePreferences(text: string): {
  preferredDay: "today" | "tomorrow" | "dayAfter" | null;
  preferredTime: "morning" | "afternoon" | "evening" | null;
  rawTimeText: string | null;
} {
  const normalizedText = text.toLowerCase();
  let preferredDay: "today" | "tomorrow" | "dayAfter" | null = null;
  let preferredTime: "morning" | "afternoon" | "evening" | null = null;

  // Check day preferences (check more specific first)
  // Check "day after tomorrow" BEFORE "tomorrow"
  for (const kw of TIME_KEYWORDS.dayAfter) {
    if (normalizedText.includes(kw) || text.includes(kw)) {
      preferredDay = "dayAfter";
      break;
    }
  }
  if (!preferredDay) {
    for (const kw of TIME_KEYWORDS.tomorrow) {
      if (normalizedText.includes(kw) || text.includes(kw)) {
        preferredDay = "tomorrow";
        break;
      }
    }
  }
  if (!preferredDay) {
    for (const kw of TIME_KEYWORDS.today) {
      if (normalizedText.includes(kw) || text.includes(kw)) {
        preferredDay = "today";
        break;
      }
    }
  }

  // Check time preferences
  // Check evening/afternoon first (more specific times)
  for (const kw of TIME_KEYWORDS.evening) {
    if (normalizedText.includes(kw) || text.includes(kw)) {
      preferredTime = "evening";
      break;
    }
  }
  if (!preferredTime) {
    for (const kw of TIME_KEYWORDS.afternoon) {
      if (normalizedText.includes(kw) || text.includes(kw)) {
        preferredTime = "afternoon";
        break;
      }
    }
  }
  if (!preferredTime) {
    for (const kw of TIME_KEYWORDS.morning) {
      if (normalizedText.includes(kw) || text.includes(kw)) {
        preferredTime = "morning";
        break;
      }
    }
  }

  return {
    preferredDay,
    preferredTime,
    rawTimeText: null, // Would be extracted by LLM for complex cases
  };
}

/**
 * Generate a draft response for appointment requests (rules-based)
 * For complex cases, use LLM via action
 */
export function generateAppointmentDraftResponse(
  intent: "book" | "reschedule" | "cancel",
  patientName: string,
  timePrefs: ReturnType<typeof extractTimePreferences>,
  language: "english" | "hindi" = "english"
): string {
  const name = patientName.split(" ")[0]; // First name

  if (intent === "book") {
    if (language === "hindi") {
      if (timePrefs.preferredDay === "today") {
        return `नमस्ते ${name} जी, आज के लिए अपॉइंटमेंट के लिए धन्यवाद। कृपया क्लिनिक आने से पहले कॉल करके कन्फर्म कर लें।`;
      } else if (timePrefs.preferredDay === "tomorrow") {
        return `नमस्ते ${name} जी, कल के लिए अपॉइंटमेंट नोट कर लिया है। समय की पुष्टि जल्द ही होगी।`;
      }
      return `नमस्ते ${name} जी, अपॉइंटमेंट रिक्वेस्ट मिल गई है। डॉक्टर साहब जल्द ही टाइम कन्फर्म करेंगे।`;
    }

    // English
    if (timePrefs.preferredDay === "today") {
      return `Hello ${name}, thank you for your appointment request for today. Please call before coming to confirm availability.`;
    } else if (timePrefs.preferredDay === "tomorrow") {
      return `Hello ${name}, your appointment request for tomorrow has been noted. We will confirm the exact time shortly.`;
    }
    return `Hello ${name}, your appointment request has been received. Doctor will confirm the available time slot shortly.`;
  }

  if (intent === "reschedule") {
    if (language === "hindi") {
      return `नमस्ते ${name} जी, अपॉइंटमेंट रीशेड्यूल करने की रिक्वेस्ट मिल गई है। कृपया नया समय बताएं।`;
    }
    return `Hello ${name}, your request to reschedule has been received. Please let us know your preferred new timing.`;
  }

  if (intent === "cancel") {
    if (language === "hindi") {
      return `नमस्ते ${name} जी, आपकी अपॉइंटमेंट कैंसल कर दी गई है। जब भी सुविधा हो, नई अपॉइंटमेंट बुक करें।`;
    }
    return `Hello ${name}, your appointment has been cancelled. Feel free to book a new appointment whenever convenient.`;
  }

  return `Hello ${name}, we have received your message. Our team will get back to you shortly.`;
}

/**
 * Create an appointment request from a patient message
 */
export const createAppointmentRequest = mutation({
  args: {
    messageId: v.id("messages"),
    patientId: v.id("patients"),
    doctorId: v.id("doctors"),
    intent: v.string(),
    preferredDay: v.optional(v.string()),
    preferredTime: v.optional(v.string()),
    draftResponse: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Calculate preferred date based on day preference
    let preferredDateTime = Date.now();
    if (args.preferredDay === "today") {
      preferredDateTime = Date.now();
    } else if (args.preferredDay === "tomorrow") {
      preferredDateTime = Date.now() + 24 * 60 * 60 * 1000;
    } else if (args.preferredDay === "dayAfter") {
      preferredDateTime = Date.now() + 2 * 24 * 60 * 60 * 1000;
    }

    // Adjust for time preference
    const date = new Date(preferredDateTime);
    if (args.preferredTime === "morning") {
      date.setHours(10, 0, 0, 0);
    } else if (args.preferredTime === "afternoon") {
      date.setHours(14, 0, 0, 0);
    } else if (args.preferredTime === "evening") {
      date.setHours(18, 0, 0, 0);
    } else {
      date.setHours(10, 0, 0, 0); // Default to 10 AM
    }

    // Create appointment with "requested" status
    const appointmentId = await ctx.db.insert("appointments", {
      doctorId: args.doctorId,
      patientId: args.patientId,
      dateTime: date.getTime(),
      status: "requested",
      reason: `Appointment request from WhatsApp (${args.intent})`,
    });

    // Update the message with the draft response and link to appointment
    if (args.draftResponse) {
      await ctx.db.patch(args.messageId, {
        draftResponse: args.draftResponse,
        intent: `appointment:${args.intent}`,
        triageCategory: "admin",
      });
    }

    // Log to audit
    await ctx.db.insert("auditLog", {
      doctorId: args.doctorId,
      action: "appointment_request_created",
      details: JSON.stringify({
        messageId: args.messageId,
        appointmentId,
        intent: args.intent,
        preferredDay: args.preferredDay,
        preferredTime: args.preferredTime,
      }),
      performedBy: "system",
      timestamp: Date.now(),
    });

    return { appointmentId };
  },
});

/**
 * Query to check appointment intent for a message
 */
export const checkAppointmentIntent = query({
  args: {
    content: v.string(),
  },
  handler: async (_ctx, args) => {
    const intentResult = detectAppointmentIntent(args.content);
    const timePrefs = extractTimePreferences(args.content);

    return {
      ...intentResult,
      timePreferences: timePrefs,
    };
  },
});

// Export for testing
export const KEYWORDS = APPOINTMENT_KEYWORDS;
