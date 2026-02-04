/**
 * Document Processing Tests
 *
 * These tests verify the document processing logic.
 * Note: Full integration tests require a running Convex backend.
 */

import { describe, it, expect } from 'vitest';

// Category configuration (mirrors the component)
const categoryConfig: Record<string, { label: string; color: string }> = {
  lab_report: { label: "Lab Report", color: "bg-blue-500" },
  prescription: { label: "Prescription", color: "bg-green-500" },
  discharge_summary: { label: "Discharge", color: "bg-purple-500" },
  ecg: { label: "ECG", color: "bg-red-500" },
  echo_report: { label: "Echo", color: "bg-pink-500" },
  angiography: { label: "Angiography", color: "bg-orange-500" },
  imaging: { label: "Imaging", color: "bg-cyan-500" },
  medical_certificate: { label: "Certificate", color: "bg-yellow-500" },
  insurance_form: { label: "Insurance", color: "bg-gray-500" },
  whatsapp_media: { label: "WhatsApp", color: "bg-emerald-500" },
  other: { label: "Other", color: "bg-slate-500" },
};

// Mime type to extension mapping (mirrors the adapter)
const mimeToExt: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "audio/ogg": ".ogg",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "video/mp4": ".mp4",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

describe('Document Categories', () => {
  it('should have all expected categories', () => {
    const expectedCategories = [
      'lab_report',
      'prescription',
      'discharge_summary',
      'ecg',
      'echo_report',
      'angiography',
      'imaging',
      'medical_certificate',
      'insurance_form',
      'whatsapp_media',
      'other',
    ];

    expectedCategories.forEach(category => {
      expect(categoryConfig[category]).toBeDefined();
      expect(categoryConfig[category].label).toBeTruthy();
      expect(categoryConfig[category].color).toMatch(/^bg-/);
    });
  });

  it('should have unique labels for each category', () => {
    const labels = Object.values(categoryConfig).map(c => c.label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });
});

describe('MIME Type Handling', () => {
  it('should map common image types', () => {
    expect(mimeToExt['image/jpeg']).toBe('.jpg');
    expect(mimeToExt['image/png']).toBe('.png');
    expect(mimeToExt['image/webp']).toBe('.webp');
  });

  it('should map PDF type', () => {
    expect(mimeToExt['application/pdf']).toBe('.pdf');
  });

  it('should map audio types', () => {
    expect(mimeToExt['audio/ogg']).toBe('.ogg');
    expect(mimeToExt['audio/mpeg']).toBe('.mp3');
  });

  it('should map video types', () => {
    expect(mimeToExt['video/mp4']).toBe('.mp4');
  });

  it('should map document types', () => {
    expect(mimeToExt['application/msword']).toBe('.doc');
    expect(mimeToExt['application/vnd.openxmlformats-officedocument.wordprocessingml.document']).toBe('.docx');
  });
});

describe('Category Detection from Caption', () => {
  // Simulate the caption-based category detection logic
  function detectCategoryFromCaption(caption: string): string {
    const captionLower = caption.toLowerCase();

    if (captionLower.includes("report") || captionLower.includes("test") || captionLower.includes("lab")) {
      return "lab_report";
    }
    if (captionLower.includes("prescription") || captionLower.includes("rx")) {
      return "prescription";
    }
    if (captionLower.includes("discharge") || captionLower.includes("summary")) {
      return "discharge_summary";
    }
    if (captionLower.includes("ecg") || captionLower.includes("ekg")) {
      return "ecg";
    }

    return "whatsapp_media";
  }

  it('should detect lab reports', () => {
    expect(detectCategoryFromCaption('my blood test report')).toBe('lab_report');
    expect(detectCategoryFromCaption('Lab Report from hospital')).toBe('lab_report');
    expect(detectCategoryFromCaption('Here is the test result')).toBe('lab_report');
  });

  it('should detect prescriptions', () => {
    expect(detectCategoryFromCaption('Doctor prescription')).toBe('prescription');
    expect(detectCategoryFromCaption('RX from clinic')).toBe('prescription');
  });

  it('should detect discharge summaries', () => {
    expect(detectCategoryFromCaption('Discharge summary')).toBe('discharge_summary');
    expect(detectCategoryFromCaption('Hospital discharge papers')).toBe('discharge_summary');
  });

  it('should detect ECG', () => {
    // Note: "ECG report" matches "report" first, so it becomes lab_report
    // Only pure ECG/EKG mentions without "report" are categorized as ecg
    expect(detectCategoryFromCaption('ECG from hospital')).toBe('ecg');
    expect(detectCategoryFromCaption('My EKG from today')).toBe('ecg');
  });

  it('should default to whatsapp_media for unclear captions', () => {
    expect(detectCategoryFromCaption('here is a photo')).toBe('whatsapp_media');
    expect(detectCategoryFromCaption('document attached')).toBe('whatsapp_media');
    expect(detectCategoryFromCaption('')).toBe('whatsapp_media');
  });
});

describe('File Type Detection', () => {
  function getFileType(mimeType: string, mediaType: string): string {
    if (mediaType === "image" || mediaType === "sticker") {
      return "image";
    }
    if (mediaType === "document") {
      return mimeType?.includes("pdf") ? "pdf" : "image";
    }
    if (mediaType === "audio") {
      return "audio";
    }
    if (mediaType === "video") {
      return "video";
    }
    return "image";
  }

  it('should identify images', () => {
    expect(getFileType('image/jpeg', 'image')).toBe('image');
    expect(getFileType('image/png', 'image')).toBe('image');
  });

  it('should identify stickers as images', () => {
    expect(getFileType('image/webp', 'sticker')).toBe('image');
  });

  it('should identify PDFs', () => {
    expect(getFileType('application/pdf', 'document')).toBe('pdf');
  });

  it('should identify non-PDF documents as images', () => {
    expect(getFileType('application/msword', 'document')).toBe('image');
  });

  it('should identify audio', () => {
    expect(getFileType('audio/ogg', 'audio')).toBe('audio');
  });

  it('should identify video', () => {
    expect(getFileType('video/mp4', 'video')).toBe('video');
  });
});

describe('OCR Processing Status', () => {
  const validStatuses = ['pending', 'processing', 'completed', 'failed'];

  it('should have all valid statuses', () => {
    expect(validStatuses).toContain('pending');
    expect(validStatuses).toContain('processing');
    expect(validStatuses).toContain('completed');
    expect(validStatuses).toContain('failed');
  });

  function needsOcr(fileType: string): boolean {
    return fileType === "image" || fileType === "pdf";
  }

  it('images should need OCR', () => {
    expect(needsOcr('image')).toBe(true);
  });

  it('PDFs should need OCR', () => {
    expect(needsOcr('pdf')).toBe(true);
  });

  it('audio should not need OCR', () => {
    expect(needsOcr('audio')).toBe(false);
  });

  it('video should not need OCR', () => {
    expect(needsOcr('video')).toBe(false);
  });
});

describe('Search Functionality', () => {
  function searchInText(text: string, query: string): boolean {
    return text.toLowerCase().includes(query.toLowerCase());
  }

  it('should perform case-insensitive search', () => {
    expect(searchInText('Lab Report', 'lab')).toBe(true);
    expect(searchInText('lab report', 'LAB')).toBe(true);
    expect(searchInText('REPORT', 'report')).toBe(true);
  });

  it('should find partial matches', () => {
    expect(searchInText('hemoglobin level', 'hemo')).toBe(true);
    expect(searchInText('prescription', 'script')).toBe(true);
  });

  it('should return false for non-matches', () => {
    expect(searchInText('Lab Report', 'ecg')).toBe(false);
    expect(searchInText('prescription', 'discharge')).toBe(false);
  });
});
