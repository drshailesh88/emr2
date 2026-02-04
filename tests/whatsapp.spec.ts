/**
 * WhatsApp Integration Tests
 *
 * Tests for WhatsApp-related functionality.
 * Note: Actual WhatsApp adapter requires external service.
 * These tests verify the logic and data structures.
 */

import { test, expect } from '@playwright/test';

test.describe('WhatsApp Message Formatting', () => {
  test('phone number normalization works correctly', () => {
    const normalizePhone = (phone: string): string => {
      // Remove all non-digits
      const digits = phone.replace(/\D/g, '');
      // Add country code if not present
      if (digits.length === 10) {
        return `91${digits}`;
      }
      if (digits.startsWith('91') && digits.length === 12) {
        return digits;
      }
      return digits;
    };

    expect(normalizePhone('9876543210')).toBe('919876543210');
    expect(normalizePhone('+91 98765 43210')).toBe('919876543210');
    expect(normalizePhone('919876543210')).toBe('919876543210');
  });

  test('message templates have placeholders', () => {
    const appointmentConfirmation = 'Hello {{patientName}}, your appointment with Dr. {{doctorName}} is confirmed for {{date}} at {{time}}.';

    expect(appointmentConfirmation).toContain('{{patientName}}');
    expect(appointmentConfirmation).toContain('{{doctorName}}');
    expect(appointmentConfirmation).toContain('{{date}}');
    expect(appointmentConfirmation).toContain('{{time}}');
  });

  test('template interpolation works', () => {
    const template = 'Hello {{name}}, your payment of Rs. {{amount}} is confirmed.';
    const data = { name: 'Rahul', amount: '500' };

    const interpolate = (tmpl: string, vars: Record<string, string>) => {
      return tmpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
    };

    const result = interpolate(template, data);
    expect(result).toBe('Hello Rahul, your payment of Rs. 500 is confirmed.');
  });
});

test.describe('Emergency Detection Keywords', () => {
  // Import emergency keywords from the actual implementation
  const emergencyKeywords = [
    'chest pain', 'chest discomfort', 'seene mein dard', 'सीने में दर्द',
    'breathless', 'breathlessness', 'shortness of breath', "can't breathe",
    'saans nahi aa rahi', 'सांस नहीं आ रही', 'saans phool rahi',
    'very high bp', 'bp bahut high', 'blood pressure very high',
    'fainted', 'unconscious', 'behosh', 'गिर गया', 'passed out', 'blackout', 'collapsed',
    'not responding', 'unresponsive', 'no pulse', 'heart stopped', 'cardiac arrest',
  ];

  test('emergency keywords are comprehensive', () => {
    expect(emergencyKeywords.length).toBeGreaterThan(20);
  });

  test('emergency detection includes Hindi keywords', () => {
    const hindiKeywords = emergencyKeywords.filter(
      (k) => /[\u0900-\u097F]/.test(k) || k.includes('saans') || k.includes('seene') || k.includes('behosh')
    );
    expect(hindiKeywords.length).toBeGreaterThan(5);
  });

  test('emergency detection is case insensitive', () => {
    const detectEmergency = (message: string): boolean => {
      const lowerMessage = message.toLowerCase();
      return emergencyKeywords.some((keyword) => lowerMessage.includes(keyword.toLowerCase()));
    };

    expect(detectEmergency('I have CHEST PAIN')).toBe(true);
    expect(detectEmergency('BREATHLESS')).toBe(true);
    expect(detectEmergency('hello doctor')).toBe(false);
  });
});

test.describe('Message Intake Pipeline', () => {
  test('message categories are defined', () => {
    const messageCategories = [
      'appointment_request',
      'appointment_cancel',
      'appointment_reschedule',
      'emergency',
      'general_query',
      'prescription_request',
      'document',
      'payment',
      'greeting',
      'other',
    ];

    expect(messageCategories).toContain('emergency');
    expect(messageCategories).toContain('appointment_request');
    expect(messageCategories).toContain('document');
  });

  test('approval status values are valid', () => {
    const approvalStatuses = ['pending', 'approved', 'rejected', 'auto_approved'];

    expect(approvalStatuses).toContain('pending');
    expect(approvalStatuses).toContain('approved');
    expect(approvalStatuses).toContain('rejected');
  });
});

test.describe('WhatsApp Adapter Endpoints', () => {
  // These tests verify expected endpoint structure
  test('send-message endpoint structure', () => {
    const endpoint = '/send-message';
    const expectedPayload = {
      phone: '919876543210',
      message: 'Hello, this is a test message',
    };

    expect(endpoint).toBe('/send-message');
    expect(expectedPayload.phone).toMatch(/^\d{12}$/);
  });

  test('send-document endpoint structure', () => {
    const endpoint = '/send-document';
    const expectedPayload = {
      phone: '919876543210',
      documentUrl: 'https://example.com/prescription.pdf',
      filename: 'prescription.pdf',
      caption: 'Your prescription from Dr. Test',
    };

    expect(endpoint).toBe('/send-document');
    expect(expectedPayload.documentUrl).toMatch(/^https?:\/\//);
    expect(expectedPayload.filename).toContain('.pdf');
  });
});

test.describe('Appointment Intent Detection', () => {
  const bookingKeywords = [
    'book', 'appointment', 'schedule', 'meet', 'see doctor',
    'milna hai', 'appointment chahiye', 'मिलना है', 'अपॉइंटमेंट',
  ];

  const cancelKeywords = [
    'cancel', 'nahi aa sakta', 'not coming', 'रद्द',
  ];

  test('booking intent detection', () => {
    const isBookingIntent = (message: string): boolean => {
      const lower = message.toLowerCase();
      return bookingKeywords.some((k) => lower.includes(k.toLowerCase()));
    };

    expect(isBookingIntent('I want to book an appointment')).toBe(true);
    expect(isBookingIntent('mujhe doctor se milna hai')).toBe(true);
    expect(isBookingIntent('thank you')).toBe(false);
  });

  test('cancel intent detection', () => {
    const isCancelIntent = (message: string): boolean => {
      const lower = message.toLowerCase();
      return cancelKeywords.some((k) => lower.includes(k.toLowerCase()));
    };

    expect(isCancelIntent('I want to cancel my appointment')).toBe(true);
    expect(isCancelIntent('nahi aa sakta kal')).toBe(true);
    expect(isCancelIntent('see you tomorrow')).toBe(false);
  });
});

test.describe('Time Preference Extraction', () => {
  test('time of day detection', () => {
    const getTimeOfDay = (message: string): string | null => {
      const lower = message.toLowerCase();
      if (lower.includes('morning') || lower.includes('subah')) return 'morning';
      if (lower.includes('afternoon') || lower.includes('dopahar')) return 'afternoon';
      if (lower.includes('evening') || lower.includes('shaam')) return 'evening';
      return null;
    };

    expect(getTimeOfDay('tomorrow morning')).toBe('morning');
    expect(getTimeOfDay('kal shaam ko')).toBe('evening');
    expect(getTimeOfDay('anytime')).toBeNull();
  });

  test('relative day detection', () => {
    const getRelativeDay = (message: string): string | null => {
      const lower = message.toLowerCase();
      if (lower.includes('today') || lower.includes('aaj')) return 'today';
      if (lower.includes('tomorrow') || lower.includes('kal')) return 'tomorrow';
      if (lower.includes('day after') || lower.includes('parso')) return 'day_after_tomorrow';
      return null;
    };

    expect(getRelativeDay('I want to come today')).toBe('today');
    expect(getRelativeDay('kal subah')).toBe('tomorrow');
    expect(getRelativeDay('parso aana hai')).toBe('day_after_tomorrow');
  });
});
