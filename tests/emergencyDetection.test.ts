/**
 * Emergency Detection Tests
 *
 * Run with: npx tsx tests/emergencyDetection.test.ts
 */

import { detectEmergency, isEmergencyMessage, getEmergencyPriority } from "../convex/emergencyDetection";

// Test cases from acceptance criteria
const testCases = [
  // English - should detect
  { input: "I have severe chest pain", expectedEmergency: true, expectedPriority: "P1" },
  { input: "Doctor, I can't breathe properly", expectedEmergency: true, expectedPriority: "P1" },
  { input: "My father fainted and is unconscious", expectedEmergency: true, expectedPriority: "P0" },
  { input: "BP is very high, 200/120", expectedEmergency: true, expectedPriority: "P1" },
  { input: "heart attack symptoms", expectedEmergency: true, expectedPriority: "P1" },
  { input: "patient collapsed and not responding", expectedEmergency: true, expectedPriority: "P0" },

  // Transliterated Hindi - should detect
  { input: "seene mein dard ho raha hai", expectedEmergency: true, expectedPriority: "P1" },
  { input: "saans nahi aa rahi hai", expectedEmergency: true, expectedPriority: "P1" },
  { input: "mera pita behosh ho gaya", expectedEmergency: true, expectedPriority: "P0" },
  { input: "bp bahut high hai", expectedEmergency: true, expectedPriority: "P1" },
  { input: "dum ghut raha hai", expectedEmergency: true, expectedPriority: "P1" },

  // Devanagari - should detect
  { input: "मुझे सीने में दर्द है", expectedEmergency: true, expectedPriority: "P1" },
  { input: "सांस नहीं आ रही", expectedEmergency: true, expectedPriority: "P1" },
  { input: "बेहोश हो गया", expectedEmergency: true, expectedPriority: "P0" },
  { input: "बीपी बहुत हाई है", expectedEmergency: true, expectedPriority: "P1" },
  { input: "दिल में दर्द हो रहा है", expectedEmergency: true, expectedPriority: "P1" },

  // Non-emergency - should NOT detect
  { input: "I need to book an appointment", expectedEmergency: false, expectedPriority: null },
  { input: "When is the doctor available?", expectedEmergency: false, expectedPriority: null },
  { input: "Please send my prescription", expectedEmergency: false, expectedPriority: null },
  { input: "Thank you doctor", expectedEmergency: false, expectedPriority: null },
  { input: "मुझे अपॉइंटमेंट चाहिए", expectedEmergency: false, expectedPriority: null },
  { input: "appointment lena hai", expectedEmergency: false, expectedPriority: null },
  { input: "My regular checkup is due", expectedEmergency: false, expectedPriority: null },
  { input: "What are your clinic timings?", expectedEmergency: false, expectedPriority: null },

  // Edge cases
  { input: "", expectedEmergency: false, expectedPriority: null },
  { input: "chest", expectedEmergency: false, expectedPriority: null }, // Partial keyword
  { input: "CHEST PAIN", expectedEmergency: true, expectedPriority: "P1" }, // Uppercase
  { input: "  chest   pain  ", expectedEmergency: true, expectedPriority: "P1" }, // Extra whitespace
];

console.log("Running Emergency Detection Tests\n");
console.log("=".repeat(60));

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = detectEmergency(tc.input);
  const priority = getEmergencyPriority(tc.input);

  const emergencyPass = result.isEmergency === tc.expectedEmergency;
  const priorityPass = priority === tc.expectedPriority;
  const allPass = emergencyPass && priorityPass;

  if (allPass) {
    passed++;
    console.log(`✅ PASS: "${tc.input.substring(0, 40)}..."`);
  } else {
    failed++;
    console.log(`❌ FAIL: "${tc.input.substring(0, 40)}..."`);
    console.log(`   Expected: emergency=${tc.expectedEmergency}, priority=${tc.expectedPriority}`);
    console.log(`   Got:      emergency=${result.isEmergency}, priority=${priority}`);
    if (result.isEmergency) {
      console.log(`   Matched:  ${result.matchedKeywords.join(", ")}`);
      console.log(`   Categories: ${result.categories.join(", ")}`);
    }
  }
}

console.log("\n" + "=".repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

// Performance test
console.log("\n" + "=".repeat(60));
console.log("Performance Test\n");

const longMessage = "Patient reports that yesterday around 3pm they started experiencing some discomfort. They mentioned having chest pain and difficulty breathing. The symptoms have been getting worse.";

const iterations = 10000;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  detectEmergency(longMessage);
}
const end = performance.now();
const avgTime = (end - start) / iterations;

console.log(`Average detection time: ${avgTime.toFixed(3)}ms over ${iterations} iterations`);
console.log(`Target: < 10ms`);
console.log(avgTime < 10 ? "✅ Performance PASS" : "❌ Performance FAIL");

// Exit with error if tests failed
if (failed > 0) {
  process.exit(1);
}
