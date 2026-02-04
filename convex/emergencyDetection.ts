/**
 * Emergency Keyword Detection - Rules-First Implementation
 *
 * IMPORTANT: This uses ONLY keyword matching, NO LLM calls.
 * Per constitution: "Emergency detection is rules-first"
 *
 * Supports:
 * - English keywords
 * - Transliterated Hindi (romanized)
 * - Devanagari script (Hindi)
 */

// Emergency keyword categories with English, transliterated Hindi, and Devanagari
const EMERGENCY_KEYWORDS = {
  chestPain: {
    english: [
      "chest pain",
      "chest discomfort",
      "heart pain",
      "heart attack",
      "pain in chest",
      "tightness in chest",
      "pressure in chest",
    ],
    hindiTranslit: [
      "seene mein dard",
      "seene me dard",
      "sine mein dard",
      "sine me dard",
      "chhati mein dard",
      "chhati me dard",
      "dil mein dard",
      "dil me dard",
    ],
    devanagari: [
      "सीने में दर्द",
      "छाती में दर्द",
      "दिल में दर्द",
      "सीने मे दर्द",
    ],
  },
  breathlessness: {
    english: [
      "breathless",
      "breathlessness",
      "shortness of breath",
      "can't breathe",
      "cannot breathe",
      "cant breathe",
      "difficulty breathing",
      "hard to breathe",
      "struggling to breathe",
      "gasping",
      "suffocating",
    ],
    hindiTranslit: [
      "saans nahi aa rahi",
      "sans nahi aa rahi",
      "saans nahi aarahi",
      "saans phool rahi",
      "sans phool rahi",
      "saans phoolna",
      "saans lene mein taklif",
      "saans lene me taklif",
      "dum ghut raha",
      "dum ghutna",
    ],
    devanagari: [
      "सांस नहीं आ रही",
      "सांस फूल रही",
      "सांस लेने में तकलीफ",
      "दम घुट रहा",
      "सांस नही आ रही",
    ],
  },
  highBP: {
    english: [
      "very high bp",
      "bp very high",
      "bp is very high",
      "bp is too high",
      "blood pressure very high",
      "blood pressure is very high",
      "extremely high bp",
      "dangerously high bp",
      "bp too high",
      "hypertensive crisis",
      "high blood pressure",
      "bp high",
    ],
    hindiTranslit: [
      "bp bahut high",
      "bp bahut jyada",
      "blood pressure bahut high",
      "bp badh gaya",
    ],
    devanagari: [
      "बीपी बहुत हाई",
      "ब्लड प्रेशर बहुत हाई",
      "बीपी बढ़ गया",
    ],
  },
  unconscious: {
    english: [
      "fainted",
      "fainting",
      "unconscious",
      "passed out",
      "blackout",
      "collapsed",
      "not waking up",
      "unresponsive",
      "not responding",
      "lost consciousness",
    ],
    hindiTranslit: [
      "behosh",
      "behosh ho gaya",
      "behosh ho gayi",
      "gir gaya",
      "gir gayi",
      "hosh nahi",
      "hosh nahi hai",
    ],
    devanagari: [
      "बेहोश",
      "बेहोश हो गया",
      "बेहोश हो गयी",
      "गिर गया",
      "गिर गयी",
      "होश नहीं",
    ],
  },
  cardiacArrest: {
    english: [
      "no pulse",
      "heart stopped",
      "cardiac arrest",
      "heart not beating",
      "not breathing",
      "cpr",
    ],
    hindiTranslit: [
      "dil band",
      "dil ruk gaya",
      "nabz nahi",
      "nabj nahi",
    ],
    devanagari: [
      "दिल बंद",
      "दिल रुक गया",
      "नब्ज़ नहीं",
    ],
  },
};

// Flatten all keywords into a single searchable list
interface KeywordEntry {
  keyword: string;
  category: string;
  language: "english" | "hindiTranslit" | "devanagari";
}

const ALL_KEYWORDS: KeywordEntry[] = [];

for (const [category, keywords] of Object.entries(EMERGENCY_KEYWORDS)) {
  for (const kw of keywords.english) {
    ALL_KEYWORDS.push({ keyword: kw.toLowerCase(), category, language: "english" });
  }
  for (const kw of keywords.hindiTranslit) {
    ALL_KEYWORDS.push({ keyword: kw.toLowerCase(), category, language: "hindiTranslit" });
  }
  for (const kw of keywords.devanagari) {
    ALL_KEYWORDS.push({ keyword: kw, category, language: "devanagari" });
  }
}

/**
 * Normalize text for matching
 * - Lowercase (for English/transliterated)
 * - Remove extra whitespace
 * - Normalize common variations
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''`]/g, "'") // Normalize apostrophes
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Check if text contains emergency keywords
 * Returns matched keywords and categories
 *
 * Performance: O(n*m) where n = text length, m = keyword count
 * Typically completes in < 5ms for normal message lengths
 */
export function detectEmergency(text: string): {
  isEmergency: boolean;
  matchedKeywords: string[];
  categories: string[];
  confidence: "high" | "medium" | "low";
} {
  const normalizedText = normalizeText(text);
  const matchedKeywords: string[] = [];
  const categories = new Set<string>();

  for (const entry of ALL_KEYWORDS) {
    // For Devanagari, search in original text (case doesn't matter)
    // For English/transliterated, search in normalized text
    const searchText = entry.language === "devanagari" ? text : normalizedText;
    const searchKeyword = entry.language === "devanagari" ? entry.keyword : entry.keyword.toLowerCase();

    if (searchText.includes(searchKeyword)) {
      matchedKeywords.push(entry.keyword);
      categories.add(entry.category);
    }
  }

  // Determine confidence based on matches
  let confidence: "high" | "medium" | "low" = "low";
  if (matchedKeywords.length >= 2) {
    confidence = "high";
  } else if (matchedKeywords.length === 1) {
    // Single keyword match - check if it's a strong indicator
    const strongIndicators = [
      "cardiac arrest", "heart stopped", "no pulse", "unconscious",
      "not responding", "collapsed", "बेहोश", "दिल रुक गया"
    ];
    if (matchedKeywords.some(kw => strongIndicators.includes(kw))) {
      confidence = "high";
    } else {
      confidence = "medium";
    }
  }

  return {
    isEmergency: matchedKeywords.length > 0,
    matchedKeywords,
    categories: Array.from(categories),
    confidence,
  };
}

/**
 * Quick check - just returns boolean
 * Use this when you only need to know if it's an emergency
 */
export function isEmergencyMessage(text: string): boolean {
  return detectEmergency(text).isEmergency;
}

/**
 * Get emergency priority level
 * P0 = Immediate life threat (cardiac arrest, unconscious, no pulse)
 * P1 = Urgent (chest pain, severe breathlessness, very high BP)
 */
export function getEmergencyPriority(text: string): "P0" | "P1" | null {
  const result = detectEmergency(text);

  if (!result.isEmergency) {
    return null;
  }

  // P0: Life-threatening emergencies
  const p0Categories = ["cardiacArrest", "unconscious"];
  if (result.categories.some(cat => p0Categories.includes(cat))) {
    return "P0";
  }

  // P1: Urgent but not immediately life-threatening
  return "P1";
}

// Export keywords for testing/documentation
export const KEYWORDS = EMERGENCY_KEYWORDS;
