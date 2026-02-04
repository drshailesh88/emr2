/**
 * Prescription Tests
 *
 * Unit tests for prescription-related functionality
 */

import { describe, it, expect } from 'vitest';

// Import medication functions (we'll test the logic)
import {
  searchMedications,
  getMedication,
  checkDrugInteractions,
  generateHindiInstruction,
  generateFullHindiInstruction,
  frequencyOptions,
  instructionPhrases,
  commonMedications,
  prescriptionTemplates,
} from '../lib/medications';

describe('Medication Search', () => {
  it('should return empty array for short queries', () => {
    expect(searchMedications('A')).toEqual([]);
    expect(searchMedications('')).toEqual([]);
  });

  it('should find medications by partial name', () => {
    const results = searchMedications('Amlo');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Amlodipine');
  });

  it('should be case insensitive', () => {
    const results1 = searchMedications('amlo');
    const results2 = searchMedications('AMLO');
    expect(results1).toEqual(results2);
  });

  it('should limit results to 10', () => {
    const results = searchMedications('in'); // Should match many
    expect(results.length).toBeLessThanOrEqual(10);
  });
});

describe('Get Medication', () => {
  it('should find medication by exact name', () => {
    const med = getMedication('Amlodipine');
    expect(med).toBeDefined();
    expect(med?.name).toBe('Amlodipine');
    expect(med?.commonDosages).toContain('5mg');
  });

  it('should be case insensitive', () => {
    const med1 = getMedication('amlodipine');
    const med2 = getMedication('AMLODIPINE');
    expect(med1).toEqual(med2);
  });

  it('should return undefined for unknown medication', () => {
    const med = getMedication('UnknownDrug');
    expect(med).toBeUndefined();
  });
});

describe('Drug Interaction Warnings', () => {
  it('should warn about ACE inhibitor + K-sparing diuretic', () => {
    const warnings = checkDrugInteractions(['Ramipril', 'Spironolactone']);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('ACE inhibitor');
  });

  it('should warn about dual antiplatelet therapy', () => {
    const warnings = checkDrugInteractions(['Aspirin', 'Clopidogrel']);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('Dual antiplatelet');
  });

  it('should warn about anticoagulant + antiplatelet', () => {
    const warnings = checkDrugInteractions(['Warfarin', 'Aspirin']);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.includes('bleeding'))).toBe(true);
  });

  it('should warn about multiple beta-blockers', () => {
    const warnings = checkDrugInteractions(['Metoprolol', 'Atenolol']);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('beta-blockers');
  });

  it('should warn about digoxin + amiodarone', () => {
    const warnings = checkDrugInteractions(['Digoxin', 'Amiodarone']);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('Digoxin');
  });

  it('should return empty array for safe combinations', () => {
    const warnings = checkDrugInteractions(['Amlodipine', 'Atorvastatin']);
    expect(warnings.length).toBe(0);
  });

  it('should be case insensitive', () => {
    const warnings1 = checkDrugInteractions(['ramipril', 'spironolactone']);
    const warnings2 = checkDrugInteractions(['RAMIPRIL', 'SPIRONOLACTONE']);
    expect(warnings1.length).toEqual(warnings2.length);
  });
});

describe('Hindi Instruction Generation', () => {
  it('should translate "after food" to Hindi', () => {
    const hindi = generateHindiInstruction('After food');
    expect(hindi).toContain('खाना खाने के बाद');
  });

  it('should translate "before food" to Hindi', () => {
    const hindi = generateHindiInstruction('Before food');
    expect(hindi).toContain('खाना खाने से पहले');
  });

  it('should translate "empty stomach" to Hindi', () => {
    const hindi = generateHindiInstruction('Empty stomach');
    expect(hindi).toContain('खाली पेट');
  });

  it('should handle multiple instructions', () => {
    const hindi = generateHindiInstruction('Morning, after food');
    expect(hindi).toContain('सुबह');
    expect(hindi).toContain('खाना खाने के बाद');
  });

  it('should preserve unknown text', () => {
    const hindi = generateHindiInstruction('Custom instruction');
    expect(hindi).toBe('Custom instruction');
  });
});

describe('Full Hindi Instruction Generation', () => {
  it('should generate complete instruction with frequency', () => {
    const hindi = generateFullHindiInstruction(
      'Amlodipine',
      '5mg',
      'OD',
      '1 month',
      'Morning'
    );
    expect(hindi).toContain('Amlodipine');
    expect(hindi).toContain('5mg');
    expect(hindi).toContain('दिन में एक बार'); // OD in Hindi
    expect(hindi).toContain('सुबह'); // Morning in Hindi
  });

  it('should translate duration to Hindi', () => {
    const hindi = generateFullHindiInstruction(
      'Aspirin',
      '75mg',
      'OD',
      '7 days',
      'After food'
    );
    expect(hindi).toContain('7 दिन');
  });

  it('should handle "Continue" duration', () => {
    const hindi = generateFullHindiInstruction(
      'Atorvastatin',
      '40mg',
      'HS',
      'Continue',
      ''
    );
    expect(hindi).toContain('जारी रखें');
  });

  it('should handle "Lifelong" duration', () => {
    const hindi = generateFullHindiInstruction(
      'Aspirin',
      '75mg',
      'OD',
      'Lifelong',
      'After food'
    );
    expect(hindi).toContain('जीवन भर');
  });
});

describe('Frequency Options', () => {
  it('should have all standard frequency codes', () => {
    const codes = frequencyOptions.map(f => f.code);
    expect(codes).toContain('OD');
    expect(codes).toContain('BD');
    expect(codes).toContain('TDS');
    expect(codes).toContain('QID');
    expect(codes).toContain('HS');
    expect(codes).toContain('SOS');
  });

  it('should have Hindi translations for all frequencies', () => {
    frequencyOptions.forEach(freq => {
      expect(freq.hindi).toBeTruthy();
      expect(freq.hindi.length).toBeGreaterThan(0);
    });
  });

  it('should have English translations for all frequencies', () => {
    frequencyOptions.forEach(freq => {
      expect(freq.english).toBeTruthy();
      expect(freq.english.length).toBeGreaterThan(0);
    });
  });
});

describe('Instruction Phrases', () => {
  it('should have Hindi translations for common instructions', () => {
    const phrases = instructionPhrases.map(p => p.english.toLowerCase());
    expect(phrases).toContain('after food');
    expect(phrases).toContain('before food');
    expect(phrases).toContain('empty stomach');
    expect(phrases).toContain('morning');
    expect(phrases).toContain('evening');
    expect(phrases).toContain('at night');
  });

  it('should have Hindi translations for all phrases', () => {
    instructionPhrases.forEach(phrase => {
      expect(phrase.hindi).toBeTruthy();
      expect(phrase.hindi.length).toBeGreaterThan(0);
    });
  });
});

describe('Common Medications Database', () => {
  it('should have multiple medication categories', () => {
    const categories = [...new Set(commonMedications.map(m => m.category))];
    expect(categories.length).toBeGreaterThan(5);
  });

  it('should have antihypertensives', () => {
    const antihypertensives = commonMedications.filter(
      m => m.category === 'antihypertensive'
    );
    expect(antihypertensives.length).toBeGreaterThan(0);
  });

  it('should have statins', () => {
    const statins = commonMedications.filter(m => m.category === 'statin');
    expect(statins.length).toBeGreaterThan(0);
    expect(statins.some(s => s.name === 'Atorvastatin')).toBe(true);
  });

  it('should have beta-blockers', () => {
    const betaBlockers = commonMedications.filter(
      m => m.category === 'beta-blocker'
    );
    expect(betaBlockers.length).toBeGreaterThan(0);
    expect(betaBlockers.some(b => b.name === 'Metoprolol')).toBe(true);
  });

  it('should have common dosages for each medication', () => {
    commonMedications.forEach(med => {
      expect(med.commonDosages).toBeDefined();
      expect(med.commonDosages.length).toBeGreaterThan(0);
    });
  });
});

describe('Prescription Templates', () => {
  it('should have templates for common conditions', () => {
    const templateIds = prescriptionTemplates.map(t => t.id);
    expect(templateIds).toContain('hypertension-new');
    expect(templateIds).toContain('stable-angina');
    expect(templateIds).toContain('post-mi');
    expect(templateIds).toContain('heart-failure');
  });

  it('should have complete template structure', () => {
    prescriptionTemplates.forEach(template => {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.diagnosis).toBeTruthy();
      expect(template.medications).toBeDefined();
      expect(template.medications.length).toBeGreaterThan(0);
      expect(template.investigations).toBeDefined();
      expect(template.followUp).toBeTruthy();
    });
  });

  it('should have valid medication structures in templates', () => {
    prescriptionTemplates.forEach(template => {
      template.medications.forEach(med => {
        expect(med.name).toBeTruthy();
        expect(med.dosage).toBeTruthy();
        expect(med.frequency).toBeTruthy();
        expect(med.duration).toBeTruthy();
      });
    });
  });

  it('should use valid frequency codes in templates', () => {
    const validCodes = frequencyOptions.map(f => f.code);
    prescriptionTemplates.forEach(template => {
      template.medications.forEach(med => {
        expect(validCodes).toContain(med.frequency);
      });
    });
  });
});
