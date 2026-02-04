# Doctor Secretary AI - Product Spec (V1)

## Summary
Build a WhatsApp-first medical "secretary" for solo doctors in India. The system triages patient messages, coordinates appointments, ingests and summarizes documents, and drafts prescriptions for doctor approval. It must never auto-prescribe or send unsolicited clinical advice. The experience should feel like a human secretary on a separate clinic WhatsApp number.

## Goals
- Reduce doctors' cognitive load from WhatsApp and email messages.
- Provide secretary-grade triage: admin vs clinical vs emergency.
- Support appointment coordination, reschedule/cancel, and payments.
- Ingest and OCR documents, preserve records, and summarize on demand.
- Draft prescriptions in a clean template with bilingual instructions.

## Non-Goals (V1)
- No auto-prescribing or clinical advice without doctor approval.
- No interpretation of imaging (X-ray/ECG) beyond storage and retrieval.
- No multi-doctor clinic workflows; records are doctor-specific.
- No explicit patient-facing disclosure text in chat (consent handled in onboarding).

## Primary Users
- Doctor (solo practitioner).
- Patients communicating via WhatsApp and email.

## Channels
- WhatsApp (primary, via clinic-specific number).
- Email (secondary for prescriptions and attachments).

## Key Decisions (Locked)
- Default admin mode: doctor-confirmed.
- Data retention: doctor-configurable (no global default).
- WhatsApp number: doctor/clinic responsibility.
- Payments: UPI; provider likely Razorpay (final selection later).
- Doctor approvals: quick-reply commands in WhatsApp (approve, edit, call patient).
- Web dashboard: included in V1 for records and prescriptions.

## Core Features (V1)
1. Message Intake and Triage
- Classify messages into admin, clinical, emergency, or unknown.
- Emergency keywords for cardiology (chest pain, breathlessness, syncope, unresponsive, very high BP, etc.) trigger immediate escalation.
- Triage output options: respond, request info, schedule, escalate, or draft for approval.

2. Admin Workflow (Doctor-Confirmed Default)
- Appointment requests are proposed by the assistant and approved by doctor.
- Reschedule/cancel supported with doctor confirmation.
- Doctor can optionally switch to autonomous admin mode later.

3. Clinical Workflow (Always Doctor Approval)
- All clinical replies require explicit doctor approval.
- Assistant can draft responses and prescriptions for approval.

4. Emergency Escalation
- Immediate doctor alert.
- Patient receives a configurable emergency message with hospital/ambulance contact.
- Message content is doctor-configurable; default templates provided.

5. Appointment Coordination
- Time-based requests (not slot/buffer logic).
- Simple availability confirmation aligned to Indian clinic workflows.
- Supports reschedule and cancel over WhatsApp.

6. Document Ingestion and OCR
- Accept PDFs, JPEGs, PNGs directly from patient.
- OCR to extract text; store original files.
- Summarize key history and timeline from multiple documents.

7. Patient Records (Longitudinal)
- Doctor-owned records with history, HPI, exams, investigations, treatment.
- Searchable and summarized view.
- Retrieve original documents years later.

8. Prescription Drafting and Output
- Doctor writes or dictates; assistant formats and drafts.
- PDF output; printable in clinic.
- Template-driven letterhead with doctor credentials.
- Bilingual instructions (English + Hindi) using a rules-based approach where possible.

9. Payments
- UPI payment link before appointment confirmation.
- Automated receipt and payment status update.

10. Web Dashboard (V1)
- Patient list and record viewer.
- Document viewer and summaries.
- Prescription composer, preview, and PDF export.

## Experience Principles
- Feels like a human secretary on WhatsApp.
- Minimal friction for doctors.
- Clear separation between admin and clinical actions.
- Transparent approval flows for clinical content.

## Safety and Guardrails
- No clinical advice without doctor approval.
- No auto-prescribing.
- Emergency logic is rules-first, LLM-assisted only for phrasing.
- Audit log of all approvals, sent messages, and edits.

## Open Questions (V1)
- Final UPI provider selection (Razorpay is a likely choice).
- OCR engine selection (cloud vs on-device).
- Email provider for outgoing messages.
- Prescribed data retention options in UI.
