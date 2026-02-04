/**
 * Medication Database and Hindi Instruction Rules
 *
 * This module provides:
 * 1. Common medications with standard dosages
 * 2. Hindi instruction translations
 * 3. Frequency mappings
 */

// Common cardiology medications with typical dosages
export const commonMedications = [
  // Antihypertensives
  { name: "Amlodipine", category: "antihypertensive", commonDosages: ["2.5mg", "5mg", "10mg"] },
  { name: "Telmisartan", category: "antihypertensive", commonDosages: ["20mg", "40mg", "80mg"] },
  { name: "Losartan", category: "antihypertensive", commonDosages: ["25mg", "50mg", "100mg"] },
  { name: "Metoprolol", category: "beta-blocker", commonDosages: ["25mg", "50mg", "100mg"] },
  { name: "Atenolol", category: "beta-blocker", commonDosages: ["25mg", "50mg", "100mg"] },
  { name: "Nebivolol", category: "beta-blocker", commonDosages: ["2.5mg", "5mg", "10mg"] },
  { name: "Ramipril", category: "ace-inhibitor", commonDosages: ["2.5mg", "5mg", "10mg"] },
  { name: "Enalapril", category: "ace-inhibitor", commonDosages: ["2.5mg", "5mg", "10mg"] },

  // Diuretics
  { name: "Furosemide", category: "diuretic", commonDosages: ["20mg", "40mg", "80mg"] },
  { name: "Torsemide", category: "diuretic", commonDosages: ["10mg", "20mg", "40mg"] },
  { name: "Hydrochlorothiazide", category: "diuretic", commonDosages: ["12.5mg", "25mg"] },
  { name: "Spironolactone", category: "diuretic", commonDosages: ["25mg", "50mg", "100mg"] },

  // Anticoagulants / Antiplatelets
  { name: "Aspirin", category: "antiplatelet", commonDosages: ["75mg", "150mg", "325mg"] },
  { name: "Clopidogrel", category: "antiplatelet", commonDosages: ["75mg", "150mg"] },
  { name: "Ticagrelor", category: "antiplatelet", commonDosages: ["60mg", "90mg"] },
  { name: "Warfarin", category: "anticoagulant", commonDosages: ["1mg", "2mg", "5mg"] },
  { name: "Rivaroxaban", category: "anticoagulant", commonDosages: ["10mg", "15mg", "20mg"] },
  { name: "Apixaban", category: "anticoagulant", commonDosages: ["2.5mg", "5mg"] },

  // Statins
  { name: "Atorvastatin", category: "statin", commonDosages: ["10mg", "20mg", "40mg", "80mg"] },
  { name: "Rosuvastatin", category: "statin", commonDosages: ["5mg", "10mg", "20mg", "40mg"] },

  // Nitrates
  { name: "Isosorbide Mononitrate", category: "nitrate", commonDosages: ["20mg", "30mg", "60mg"] },
  { name: "Isosorbide Dinitrate", category: "nitrate", commonDosages: ["10mg", "20mg", "40mg"] },
  { name: "Nitroglycerin", category: "nitrate", commonDosages: ["0.4mg SL", "2.5mg patch"] },

  // Others
  { name: "Digoxin", category: "cardiac-glycoside", commonDosages: ["0.125mg", "0.25mg"] },
  { name: "Ivabradine", category: "heart-rate-reducer", commonDosages: ["5mg", "7.5mg"] },
  { name: "Trimetazidine", category: "anti-anginal", commonDosages: ["35mg MR"] },
  { name: "Ranolazine", category: "anti-anginal", commonDosages: ["500mg", "1000mg"] },

  // Common general medications
  { name: "Paracetamol", category: "analgesic", commonDosages: ["500mg", "650mg", "1g"] },
  { name: "Pantoprazole", category: "ppi", commonDosages: ["20mg", "40mg"] },
  { name: "Omeprazole", category: "ppi", commonDosages: ["20mg", "40mg"] },
  { name: "Rabeprazole", category: "ppi", commonDosages: ["20mg"] },
];

// Frequency codes with English and Hindi translations
export const frequencyOptions = [
  { code: "OD", english: "Once daily", hindi: "दिन में एक बार", timesPerDay: 1 },
  { code: "BD", english: "Twice daily", hindi: "दिन में दो बार", timesPerDay: 2 },
  { code: "TDS", english: "Three times daily", hindi: "दिन में तीन बार", timesPerDay: 3 },
  { code: "QID", english: "Four times daily", hindi: "दिन में चार बार", timesPerDay: 4 },
  { code: "HS", english: "At bedtime", hindi: "रात को सोने से पहले", timesPerDay: 1 },
  { code: "SOS", english: "When required", hindi: "जरूरत पड़ने पर", timesPerDay: 0 },
  { code: "STAT", english: "Immediately", hindi: "तुरंत", timesPerDay: 1 },
  { code: "Q4H", english: "Every 4 hours", hindi: "हर 4 घंटे में", timesPerDay: 6 },
  { code: "Q6H", english: "Every 6 hours", hindi: "हर 6 घंटे में", timesPerDay: 4 },
  { code: "Q8H", english: "Every 8 hours", hindi: "हर 8 घंटे में", timesPerDay: 3 },
  { code: "Weekly", english: "Once weekly", hindi: "सप्ताह में एक बार", timesPerDay: 0.14 },
];

// Common instruction phrases with Hindi translations
export const instructionPhrases = [
  { english: "After food", hindi: "खाना खाने के बाद" },
  { english: "Before food", hindi: "खाना खाने से पहले" },
  { english: "Empty stomach", hindi: "खाली पेट" },
  { english: "With water", hindi: "पानी के साथ" },
  { english: "With milk", hindi: "दूध के साथ" },
  { english: "Morning", hindi: "सुबह" },
  { english: "Evening", hindi: "शाम को" },
  { english: "At night", hindi: "रात को" },
  { english: "With breakfast", hindi: "नाश्ते के साथ" },
  { english: "With lunch", hindi: "दोपहर के खाने के साथ" },
  { english: "With dinner", hindi: "रात के खाने के साथ" },
  { english: "Chew and swallow", hindi: "चबाकर निगलें" },
  { english: "Do not crush", hindi: "गोली मत तोड़ें" },
  { english: "Keep under tongue", hindi: "जीभ के नीचे रखें" },
];

// Duration translations
export const durationPhrases = [
  { english: "days", hindi: "दिन" },
  { english: "day", hindi: "दिन" },
  { english: "weeks", hindi: "सप्ताह" },
  { english: "week", hindi: "सप्ताह" },
  { english: "months", hindi: "महीने" },
  { english: "month", hindi: "महीना" },
  { english: "Continue", hindi: "जारी रखें" },
  { english: "Lifelong", hindi: "जीवन भर" },
  { english: "As directed", hindi: "निर्देशानुसार" },
];

/**
 * Generate Hindi instruction from English instruction
 */
export function generateHindiInstruction(englishInstruction: string): string {
  let hindiInstruction = englishInstruction;

  // Replace known phrases with Hindi
  for (const phrase of instructionPhrases) {
    const regex = new RegExp(phrase.english, "gi");
    hindiInstruction = hindiInstruction.replace(regex, phrase.hindi);
  }

  return hindiInstruction;
}

/**
 * Generate full Hindi medication instruction
 */
export function generateFullHindiInstruction(
  medicationName: string,
  dosage: string,
  frequency: string,
  duration: string,
  instructions?: string
): string {
  // Find frequency translation
  const freqInfo = frequencyOptions.find(
    (f) => f.code.toLowerCase() === frequency.toLowerCase()
  );
  const freqHindi = freqInfo?.hindi || frequency;

  // Parse duration for Hindi
  let durationHindi = duration;
  for (const phrase of durationPhrases) {
    const regex = new RegExp(phrase.english, "gi");
    durationHindi = durationHindi.replace(regex, phrase.hindi);
  }

  // Generate instruction in Hindi
  let hindiText = `${medicationName} ${dosage} - ${freqHindi}`;

  if (duration) {
    hindiText += ` - ${durationHindi}`;
  }

  if (instructions) {
    const hindiInstructions = generateHindiInstruction(instructions);
    hindiText += ` (${hindiInstructions})`;
  }

  return hindiText;
}

/**
 * Search medications by name
 */
export function searchMedications(query: string): typeof commonMedications {
  if (!query || query.length < 2) return [];

  const queryLower = query.toLowerCase();
  return commonMedications
    .filter((med) => med.name.toLowerCase().includes(queryLower))
    .slice(0, 10);
}

/**
 * Get medication by exact name
 */
export function getMedication(name: string) {
  return commonMedications.find(
    (med) => med.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Basic drug interaction warnings (cardiology focus)
 * Returns warning message if interaction detected
 */
export function checkDrugInteractions(medications: string[]): string[] {
  const warnings: string[] = [];
  const medNames = medications.map((m) => m.toLowerCase());

  // Check for ACE inhibitor + Potassium-sparing diuretic
  const aceInhibitors = ["ramipril", "enalapril", "lisinopril"];
  const kSparingDiuretics = ["spironolactone"];
  const hasAce = aceInhibitors.some((ace) => medNames.some((m) => m.includes(ace)));
  const hasKSparing = kSparingDiuretics.some((d) => medNames.some((m) => m.includes(d)));
  if (hasAce && hasKSparing) {
    warnings.push("ACE inhibitor + Spironolactone: Monitor potassium levels");
  }

  // Check for dual antiplatelet
  const hasAspirin = medNames.some((m) => m.includes("aspirin"));
  const hasClopidogrel = medNames.some((m) => m.includes("clopidogrel"));
  const hasTicagrelor = medNames.some((m) => m.includes("ticagrelor"));
  if (hasAspirin && (hasClopidogrel || hasTicagrelor)) {
    warnings.push("Dual antiplatelet therapy: Increased bleeding risk");
  }

  // Check for anticoagulant + antiplatelet
  const anticoagulants = ["warfarin", "rivaroxaban", "apixaban", "dabigatran"];
  const hasAnticoagulant = anticoagulants.some((ac) => medNames.some((m) => m.includes(ac)));
  if (hasAnticoagulant && (hasAspirin || hasClopidogrel)) {
    warnings.push("Anticoagulant + Antiplatelet: High bleeding risk - ensure indication is clear");
  }

  // Check for multiple beta-blockers
  const betaBlockers = ["metoprolol", "atenolol", "nebivolol", "bisoprolol", "carvedilol"];
  const bbCount = betaBlockers.filter((bb) => medNames.some((m) => m.includes(bb))).length;
  if (bbCount > 1) {
    warnings.push("Multiple beta-blockers prescribed");
  }

  // Check for digoxin + amiodarone
  const hasDigoxin = medNames.some((m) => m.includes("digoxin"));
  const hasAmiodarone = medNames.some((m) => m.includes("amiodarone"));
  if (hasDigoxin && hasAmiodarone) {
    warnings.push("Digoxin + Amiodarone: May increase digoxin levels - consider dose reduction");
  }

  return warnings;
}

/**
 * Prescription templates for common conditions
 */
export const prescriptionTemplates = [
  {
    id: "hypertension-new",
    name: "New Hypertension",
    diagnosis: "Essential Hypertension",
    medications: [
      { name: "Amlodipine", dosage: "5mg", frequency: "OD", duration: "1 month", instructions: "Morning" },
    ],
    investigations: ["CBC", "RFT", "Lipid Profile", "ECG"],
    specialInstructions: "Low salt diet, Regular exercise, Monitor BP daily",
    followUp: "After 2 weeks",
  },
  {
    id: "hypertension-uncontrolled",
    name: "Uncontrolled Hypertension",
    diagnosis: "Uncontrolled Essential Hypertension",
    medications: [
      { name: "Telmisartan", dosage: "40mg", frequency: "OD", duration: "1 month", instructions: "Morning" },
      { name: "Amlodipine", dosage: "5mg", frequency: "OD", duration: "1 month", instructions: "Morning" },
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
      { name: "Aspirin", dosage: "75mg", frequency: "OD", duration: "Continue", instructions: "After food" },
      { name: "Atorvastatin", dosage: "40mg", frequency: "HS", duration: "Continue", instructions: "At night" },
      { name: "Metoprolol", dosage: "50mg", frequency: "BD", duration: "Continue", instructions: "" },
      { name: "Isosorbide Mononitrate", dosage: "30mg", frequency: "OD", duration: "Continue", instructions: "Morning" },
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
      { name: "Aspirin", dosage: "75mg", frequency: "OD", duration: "Lifelong", instructions: "After food" },
      { name: "Clopidogrel", dosage: "75mg", frequency: "OD", duration: "1 year", instructions: "After food" },
      { name: "Atorvastatin", dosage: "80mg", frequency: "HS", duration: "Lifelong", instructions: "" },
      { name: "Metoprolol", dosage: "50mg", frequency: "BD", duration: "Continue", instructions: "" },
      { name: "Ramipril", dosage: "5mg", frequency: "OD", duration: "Continue", instructions: "" },
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
      { name: "Furosemide", dosage: "40mg", frequency: "OD", duration: "Continue", instructions: "Morning" },
      { name: "Spironolactone", dosage: "25mg", frequency: "OD", duration: "Continue", instructions: "" },
      { name: "Ramipril", dosage: "5mg", frequency: "OD", duration: "Continue", instructions: "" },
      { name: "Metoprolol", dosage: "25mg", frequency: "BD", duration: "Continue", instructions: "" },
    ],
    investigations: ["BNP", "RFT", "Serum Electrolytes", "2D Echo"],
    specialInstructions: "Fluid restriction 1.5L/day, Daily weight monitoring, Low salt diet",
    followUp: "After 2 weeks",
  },
  {
    id: "atrial-fibrillation",
    name: "Atrial Fibrillation",
    diagnosis: "Atrial Fibrillation",
    medications: [
      { name: "Metoprolol", dosage: "50mg", frequency: "BD", duration: "Continue", instructions: "" },
      { name: "Rivaroxaban", dosage: "20mg", frequency: "OD", duration: "Continue", instructions: "With food" },
    ],
    investigations: ["ECG", "2D Echo", "Thyroid Profile"],
    specialInstructions: "Avoid missed doses of anticoagulant, Report any bleeding",
    followUp: "After 1 month with INR",
  },
];

/**
 * Get prescription template by ID
 */
export function getTemplate(templateId: string) {
  return prescriptionTemplates.find((t) => t.id === templateId);
}
