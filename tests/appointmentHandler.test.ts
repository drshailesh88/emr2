/**
 * Appointment Handler Tests
 *
 * Run with: npx tsx tests/appointmentHandler.test.ts
 */

import {
  detectAppointmentIntent,
  extractTimePreferences,
  generateAppointmentDraftResponse,
} from "../convex/appointmentHandler";

// Test cases for appointment intent detection
const intentTestCases = [
  // Booking - English
  { input: "I want to book an appointment", expectedIntent: "book", expectedRelated: true },
  { input: "Can I schedule a consultation?", expectedIntent: "book", expectedRelated: true },
  { input: "I need to see the doctor", expectedIntent: "book", expectedRelated: true },
  { input: "When is the doctor available?", expectedIntent: "book", expectedRelated: true },
  { input: "I want to book for tomorrow", expectedIntent: "book", expectedRelated: true },

  // Booking - Hindi transliterated
  { input: "Doctor se milna hai", expectedIntent: "book", expectedRelated: true },
  { input: "Kab aa sakta hoon?", expectedIntent: "book", expectedRelated: true },
  { input: "appointment chahiye", expectedIntent: "book", expectedRelated: true },

  // Booking - Devanagari
  { input: "मुझे अपॉइंटमेंट चाहिए", expectedIntent: "book", expectedRelated: true },
  { input: "डॉक्टर से मिलना है", expectedIntent: "book", expectedRelated: true },

  // Reschedule
  { input: "I need to reschedule my appointment", expectedIntent: "reschedule", expectedRelated: true },
  { input: "Can I change the time?", expectedIntent: "reschedule", expectedRelated: true },
  { input: "Please postpone my visit", expectedIntent: "reschedule", expectedRelated: true },
  { input: "Time badalna hai", expectedIntent: "reschedule", expectedRelated: true },

  // Cancel
  { input: "I want to cancel my appointment", expectedIntent: "cancel", expectedRelated: true },
  { input: "I can't come tomorrow", expectedIntent: "cancel", expectedRelated: true },
  { input: "Please cancel", expectedIntent: "cancel", expectedRelated: true },
  { input: "nahi aa sakta", expectedIntent: "cancel", expectedRelated: true },

  // Not appointment related
  { input: "I have chest pain", expectedIntent: null, expectedRelated: false },
  { input: "Thank you doctor", expectedIntent: null, expectedRelated: false },
  { input: "Hello", expectedIntent: null, expectedRelated: false },
  { input: "What are your fees?", expectedIntent: null, expectedRelated: false },
];

console.log("Running Appointment Intent Detection Tests\n");
console.log("=".repeat(60));

let passed = 0;
let failed = 0;

for (const tc of intentTestCases) {
  const result = detectAppointmentIntent(tc.input);

  const relatedPass = result.isAppointmentRelated === tc.expectedRelated;
  const intentPass = result.intent === tc.expectedIntent;
  const allPass = relatedPass && intentPass;

  if (allPass) {
    passed++;
    console.log(`✅ PASS: "${tc.input.substring(0, 40)}..."`);
  } else {
    failed++;
    console.log(`❌ FAIL: "${tc.input.substring(0, 40)}..."`);
    console.log(`   Expected: related=${tc.expectedRelated}, intent=${tc.expectedIntent}`);
    console.log(`   Got:      related=${result.isAppointmentRelated}, intent=${result.intent}`);
  }
}

console.log("\n" + "=".repeat(60));
console.log(`Intent Detection: ${passed} passed, ${failed} failed out of ${intentTestCases.length} tests`);

// Test time preference extraction
console.log("\n" + "=".repeat(60));
console.log("Time Preference Extraction Tests\n");

const timeTestCases = [
  { input: "I want to come today", expectedDay: "today", expectedTime: null },
  { input: "tomorrow morning please", expectedDay: "tomorrow", expectedTime: "morning" },
  { input: "kal shaam ko", expectedDay: "tomorrow", expectedTime: "evening" },
  { input: "aaj subah", expectedDay: "today", expectedTime: "morning" },
  { input: "कल दोपहर को", expectedDay: "tomorrow", expectedTime: "afternoon" },
  { input: "day after tomorrow in the evening", expectedDay: "dayAfter", expectedTime: "evening" },
  { input: "whenever available", expectedDay: null, expectedTime: null },
];

let timePassed = 0;
let timeFailed = 0;

for (const tc of timeTestCases) {
  const result = extractTimePreferences(tc.input);

  const dayPass = result.preferredDay === tc.expectedDay;
  const timePass = result.preferredTime === tc.expectedTime;
  const allPass = dayPass && timePass;

  if (allPass) {
    timePassed++;
    console.log(`✅ PASS: "${tc.input}"`);
  } else {
    timeFailed++;
    console.log(`❌ FAIL: "${tc.input}"`);
    console.log(`   Expected: day=${tc.expectedDay}, time=${tc.expectedTime}`);
    console.log(`   Got:      day=${result.preferredDay}, time=${result.preferredTime}`);
  }
}

console.log("\n" + "=".repeat(60));
console.log(`Time Extraction: ${timePassed} passed, ${timeFailed} failed out of ${timeTestCases.length} tests`);

// Test draft response generation
console.log("\n" + "=".repeat(60));
console.log("Draft Response Generation Tests\n");

const bookResponse = generateAppointmentDraftResponse(
  "book",
  "Rahul Sharma",
  { preferredDay: "tomorrow", preferredTime: "morning", rawTimeText: null },
  "english"
);
console.log("English booking response:", bookResponse);
console.log();

const hindiResponse = generateAppointmentDraftResponse(
  "book",
  "Rahul Sharma",
  { preferredDay: "today", preferredTime: null, rawTimeText: null },
  "hindi"
);
console.log("Hindi booking response:", hindiResponse);
console.log();

const cancelResponse = generateAppointmentDraftResponse(
  "cancel",
  "Priya Patel",
  { preferredDay: null, preferredTime: null, rawTimeText: null },
  "english"
);
console.log("Cancel response:", cancelResponse);

console.log("\n" + "=".repeat(60));
console.log("\nAll tests completed!");

// Exit with error if tests failed
if (failed > 0 || timeFailed > 0) {
  process.exit(1);
}
