# Doctor Secretary AI - Architecture (V1)

## Overview
A WhatsApp-first, doctor-controlled assistant that triages messages, coordinates appointments, ingests documents, and drafts prescriptions. The system is modular to allow migration from an unofficial WhatsApp connector to the official WhatsApp Business Platform before launch.

## High-Level Components
1. Channel Adapters
- WhatsApp Adapter (MVP): Baileys-based connector for internal testing only.
- WhatsApp Adapter (Launch): Official WhatsApp Business Platform via a provider.
- Email Adapter: inbound/outbound attachments and PDF delivery.

2. Message Router
- Normalizes inbound messages.
- Attaches patient identity and conversation context.
- Sends to triage and workflow engine.

3. Triage Service
- Rules-first emergency detection (keywords, synonyms).
- LLM classification for admin vs clinical vs unknown.
- Outputs a structured intent + suggested action.

4. Workflow Engine
- Builds tasks: appointment request, document intake, clinical draft.
- Enforces approval rules.
- Manages state transitions for appointments and approvals.

5. Approval Queue
- Doctor-confirmed admin by default.
- Always-required clinical approvals.
- Quick-reply actions in WhatsApp (approve, edit, call patient).

6. Appointment Service
- Simple availability logic (time-based requests).
- Confirm, reschedule, cancel.
- Integrates with payment confirmation.

7. Document & OCR Service
- Store original files in object storage.
- OCR PDFs/images to text.
- Summarize timelines and key data.

8. Records Service
- Longitudinal patient records, doctor-specific.
- Fetch original documents or summaries.

9. Prescription Service
- Draft prescriptions from doctor input.
- Render PDF using template engine.
- Bilingual instruction rendering (English + Hindi).

10. Payment Service
- UPI payment link generation.
- Payment status callbacks.
- Receipt creation.

11. Web Dashboard
- Records and document viewer.
- Prescription composer and PDF export.
- Approval and audit log views.

## Data Storage
- Postgres for structured data.
- Object storage for PDFs, ECGs, images.
- Optional vector index for document retrieval.

### Core Tables (Draft)
- doctors
- patients
- conversations
- messages
- attachments
- documents
- ocr_text
- appointments
- prescriptions
- approvals
- payments
- audit_log

## AI/LLM Usage
- Classification (admin vs clinical vs emergency).
- Summarization of documents.
- Drafting responses and prescriptions.

Guardrails:
- LLM cannot send messages directly.
- All clinical content requires doctor approval.
- Emergency messages use template + minimal LLM phrasing.

## WhatsApp Strategy
- MVP may use Baileys for internal prototyping only.
- Launch must use official WhatsApp Business Platform.
- Keep a strict adapter interface to swap connectors.

## Security & Compliance Posture
- Encryption at rest for structured and unstructured data.
- Role-based access: doctor-only for records.
- Audit trail for all actions.
- Patient data deletion only by doctor action.

## Deployment (Minimal Ops)
- Single region (India) for latency.
- Managed Postgres + object storage.
- App server + worker for OCR and PDF rendering.
- Observability: centralized logs + basic metrics.

## Migration Plan (WhatsApp)
- Phase 1: Baileys internal testing with a dedicated test number.
- Phase 2: Implement official WhatsApp Business adapter.
- Phase 3: Migrate pilot doctors to official API before public launch.
