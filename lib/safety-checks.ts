/**
 * Safety Checks Module
 *
 * Provides utilities for verifying system safety, emergency detection,
 * and approval workflow integrity.
 */

// Emergency keywords for cardiology (from CLAUDE.md)
export const EMERGENCY_KEYWORDS = [
  // English
  "chest pain",
  "chest discomfort",
  "breathless",
  "breathlessness",
  "shortness of breath",
  "can't breathe",
  "very high bp",
  "blood pressure very high",
  "fainted",
  "unconscious",
  "passed out",
  "blackout",
  "collapsed",
  "not responding",
  "unresponsive",
  "no pulse",
  "heart stopped",
  "cardiac arrest",
  // Hindi (transliterated)
  "seene mein dard",
  "saans nahi aa rahi",
  "saans phool rahi",
  "bp bahut high",
  "behosh",
  "gir gaya",
  // Hindi (Devanagari)
  "सीने में दर्द",
  "सांस नहीं आ रही",
  "गिर गया",
];

// Test messages for emergency detection verification
export const EMERGENCY_TEST_CASES = [
  {
    message: "I am having severe chest pain since morning",
    shouldTrigger: true,
    category: "chest_pain",
  },
  {
    message: "मुझे सीने में दर्द हो रहा है",
    shouldTrigger: true,
    category: "chest_pain_hindi",
  },
  {
    message: "Patient is breathless and can't breathe properly",
    shouldTrigger: true,
    category: "breathing",
  },
  {
    message: "saans nahi aa rahi bahut taklif hai",
    shouldTrigger: true,
    category: "breathing_hindi",
  },
  {
    message: "BP is very high, 200/120",
    shouldTrigger: true,
    category: "high_bp",
  },
  {
    message: "Patient fainted and is unconscious",
    shouldTrigger: true,
    category: "unconscious",
  },
  {
    message: "Cardiac arrest, not responding",
    shouldTrigger: true,
    category: "cardiac_arrest",
  },
  {
    message: "I need to reschedule my appointment",
    shouldTrigger: false,
    category: "routine",
  },
  {
    message: "What is the clinic timing?",
    shouldTrigger: false,
    category: "inquiry",
  },
  {
    message: "My regular BP checkup is due",
    shouldTrigger: false,
    category: "routine_bp",
  },
];

/**
 * Check if a message contains emergency keywords
 */
export function detectEmergencyKeywords(message: string): {
  isEmergency: boolean;
  matchedKeywords: string[];
} {
  const lowerMessage = message.toLowerCase();
  const matchedKeywords: string[] = [];

  for (const keyword of EMERGENCY_KEYWORDS) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }

  return {
    isEmergency: matchedKeywords.length > 0,
    matchedKeywords,
  };
}

/**
 * Run emergency detection test suite
 */
export function runEmergencyDetectionTests(): {
  passed: number;
  failed: number;
  results: Array<{
    message: string;
    expected: boolean;
    actual: boolean;
    passed: boolean;
    matchedKeywords: string[];
  }>;
} {
  const results = EMERGENCY_TEST_CASES.map((testCase) => {
    const detection = detectEmergencyKeywords(testCase.message);
    const passed = detection.isEmergency === testCase.shouldTrigger;
    return {
      message: testCase.message,
      expected: testCase.shouldTrigger,
      actual: detection.isEmergency,
      passed,
      matchedKeywords: detection.matchedKeywords,
    };
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return { passed, failed, results };
}

/**
 * Safety check results interface
 */
export interface SafetyCheckResult {
  check: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: string;
}

/**
 * Configuration safety checks
 */
export function checkConfigurationSafety(config: {
  adminApprovalMode: string;
  emergencyContact?: string;
  clinicPhone?: string;
}): SafetyCheckResult[] {
  const results: SafetyCheckResult[] = [];

  // Check approval mode
  results.push({
    check: "Approval Mode",
    status: config.adminApprovalMode === "confirm" ? "pass" : "warning",
    message:
      config.adminApprovalMode === "confirm"
        ? "All clinical messages require doctor approval"
        : `Approval mode is set to "${config.adminApprovalMode}"`,
    details:
      config.adminApprovalMode !== "confirm"
        ? "Consider enabling 'confirm' mode for maximum safety"
        : undefined,
  });

  // Check emergency contact
  results.push({
    check: "Emergency Contact",
    status: config.emergencyContact ? "pass" : "warning",
    message: config.emergencyContact
      ? "Emergency contact is configured"
      : "No emergency contact configured",
    details: config.emergencyContact || "Set an emergency contact number",
  });

  // Check clinic phone
  results.push({
    check: "Clinic Phone",
    status: config.clinicPhone ? "pass" : "warning",
    message: config.clinicPhone
      ? "Clinic phone is configured"
      : "No clinic phone configured",
  });

  return results;
}

/**
 * Data integrity checks
 */
export function checkDataIntegrity(data: {
  patientsWithPhone: number;
  patientsWithoutPhone: number;
  appointmentsWithPatient: number;
  orphanedAppointments: number;
  paymentsCompleted: number;
  paymentsPending: number;
}): SafetyCheckResult[] {
  const results: SafetyCheckResult[] = [];

  // Check patient phone coverage
  const phoneRate = data.patientsWithPhone / (data.patientsWithPhone + data.patientsWithoutPhone) * 100;
  results.push({
    check: "Patient Phone Coverage",
    status: phoneRate >= 90 ? "pass" : phoneRate >= 70 ? "warning" : "fail",
    message: `${phoneRate.toFixed(1)}% of patients have phone numbers`,
    details: `${data.patientsWithPhone} with phone, ${data.patientsWithoutPhone} without`,
  });

  // Check orphaned appointments
  results.push({
    check: "Appointment Integrity",
    status: data.orphanedAppointments === 0 ? "pass" : "warning",
    message:
      data.orphanedAppointments === 0
        ? "All appointments linked to patients"
        : `${data.orphanedAppointments} orphaned appointments found`,
  });

  // Check payment status
  const pendingRate = data.paymentsPending / (data.paymentsCompleted + data.paymentsPending + 0.001) * 100;
  results.push({
    check: "Payment Status",
    status: pendingRate < 20 ? "pass" : pendingRate < 40 ? "warning" : "fail",
    message: `${pendingRate.toFixed(1)}% of payments are pending`,
    details: `${data.paymentsCompleted} completed, ${data.paymentsPending} pending`,
  });

  return results;
}

/**
 * Approval workflow checks
 */
export function checkApprovalWorkflow(data: {
  messagesRequiringApproval: number;
  messagesApproved: number;
  messagesRejected: number;
  averageApprovalTimeMs: number;
}): SafetyCheckResult[] {
  const results: SafetyCheckResult[] = [];

  // Check approval coverage
  const totalProcessed = data.messagesApproved + data.messagesRejected;
  const approvalRate = totalProcessed / (data.messagesRequiringApproval + 0.001) * 100;
  results.push({
    check: "Message Approval Coverage",
    status: approvalRate >= 95 ? "pass" : approvalRate >= 80 ? "warning" : "fail",
    message: `${approvalRate.toFixed(1)}% of messages processed`,
    details: `${totalProcessed} processed out of ${data.messagesRequiringApproval} requiring approval`,
  });

  // Check response time
  const avgTimeHours = data.averageApprovalTimeMs / (1000 * 60 * 60);
  results.push({
    check: "Average Approval Time",
    status: avgTimeHours < 2 ? "pass" : avgTimeHours < 6 ? "warning" : "fail",
    message: `Average approval time: ${avgTimeHours.toFixed(1)} hours`,
    details: avgTimeHours > 6 ? "Consider faster response for patient satisfaction" : undefined,
  });

  return results;
}

/**
 * Overall system health score
 */
export function calculateHealthScore(
  checkResults: SafetyCheckResult[]
): {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
} {
  const passCount = checkResults.filter((r) => r.status === "pass").length;
  const warningCount = checkResults.filter((r) => r.status === "warning").length;
  const failCount = checkResults.filter((r) => r.status === "fail").length;
  const total = checkResults.length;

  // Calculate score: pass=100, warning=50, fail=0
  const score = Math.round((passCount * 100 + warningCount * 50) / total);

  let grade: "A" | "B" | "C" | "D" | "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";
  else grade = "F";

  const summary = `${passCount} passed, ${warningCount} warnings, ${failCount} failed`;

  return { score, grade, summary };
}
