# Doctor Secretary AI - Master Plan

## Positioning

> **"OpenClaw meets Healthplix"**

An AI secretary (like OpenClaw) with full EMR capabilities (like Healthplix), living in WhatsApp and your prescription app.

| OpenClaw | Healthplix | This Product |
|----------|------------|--------------|
| Lives in WhatsApp | Lives in browser | Lives in **both** |
| Does tasks for you | You do tasks in it | **Secretary does tasks, you approve** |
| General purpose | Medical specific | **Medical specific** |
| Personal assistant | Database/forms | **Secretary + EMR** |
| Remembers everything | Stores records | **Remembers + stores + acts** |

The patient and doctor should feel like they're talking to a **person** (the secretary), not using **software**. The software part (EMR, records, prescriptions) happens behind the scenes.

---

## Executive Summary

Build a "Digital Secretary" for solo doctors in India. The system is a unified AI brain that lives in:
1. Patient's WhatsApp (separate clinic number)
2. Doctor's WhatsApp (approvals, notifications)
3. EMR Web App (3-panel prescription writing interface)

The secretary handles appointment coordination, message triage, document processing, and prescription drafting. It NEVER auto-prescribes or sends clinical advice without doctor approval.

---

## Vision

> "Every doctor in a Tier 3 city should have the capabilities of a doctor in a Tier 1 corporate hospital with a human secretary."

**What we're replacing:** Human secretary (₹15,000+/month)
**What we're NOT replacing:** The doctor's clinical judgment

---

## Core Principles

1. **Unified Brain** - Same AI powers all interfaces (WhatsApp + EMR)
2. **Context-Aware Permissions** - Patient sees only their data; Doctor sees all
3. **Never Auto-Prescribe** - Clinical content requires explicit doctor approval
4. **Natural Workflow** - Doctor approves via WhatsApp, not a separate dashboard
5. **Minimal Friction** - No excessive clicking, no form-filling mentality

---

## Tech Stack (Finalized)

### Core Infrastructure

| Component | Technology | Why |
|-----------|------------|-----|
| **Database** | Convex | No SQL needed, real-time, TypeScript-only |
| **Hosting** | Railway | Long-running processes for PDF/OCR, no cold starts |
| **Frontend** | Next.js 14+ (App Router) | Proven, fast, good ecosystem |
| **UI Components** | shadcn/ui + Tailwind | Copy-paste components, no vendor lock-in |
| **Authentication** | Convex Auth | Integrated with database, simple setup |

### AI Layer

| Component | Technology | Why |
|-----------|------------|-----|
| **Everything** | Claude Sonnet 4 | One model, best quality, simple code |
| **Voice Transcription** | OpenAI Whisper | Best-in-class for Hindi |

#### Why One Model?

```
SIMPLE APPROACH (What we're doing)
──────────────────────────────────
All LLM calls → Claude Sonnet 4

• One integration
• One API key
• Consistent behavior
• Best quality everywhere
• Less code to maintain
• Optimize later if needed
```

**Principle:** Ship fast with the best. Optimize later if costs become a problem.

### Communication

| Component | Technology | Why |
|-----------|------------|-----|
| **WhatsApp (Testing)** | OpenClaw + Baileys | MIT licensed, already integrated |
| **WhatsApp (Production)** | Official Business API (provider TBD) | Ease of setup is priority over cost |
| **Email (Outbound)** | Resend | Simple API, good deliverability, free tier |
| **SMS** | Skip for v1 | Focus on WhatsApp + Email only |
| **Voice Transcription** | OpenAI Whisper | Best-in-class for Hindi, zero error tolerance |

#### WhatsApp Business API Provider (for Production)

Priority: **Ease of setup** over minor cost differences.

| Provider | Notes |
|----------|-------|
| **Gupshup** | Indian company, good local support |
| **360dialog** | Direct Meta partner |
| **Twilio** | Very reliable, excellent docs |
| **Meta Cloud API** | Direct, cheapest, more complex |

**Decision:** Will evaluate at launch time based on ease of integration.

#### Voice Transcription

Patients send voice notes in Hindi. Requirements:
- Zero errors (medical context is critical)
- Hindi language support
- Fast processing

**Decision:** OpenAI Whisper API
- Best accuracy for Hindi
- ~$0.006 per minute of audio
- Well-documented, reliable

### Payments

| Component | Technology | Why |
|-----------|------------|-----|
| **UPI Payments** | Razorpay | Indian standard, good docs, UPI + cards |
| **Receipts** | Auto-generated PDF | Same PDF engine as prescriptions |

### File Storage

| Component | Technology | Why |
|-----------|------------|-----|
| **Documents** | Convex File Storage | Integrated with database |
| **Large Files (if needed)** | Cloudflare R2 | Cheap, S3-compatible |

### PDF Generation & Document Processing

#### Document Processing: Claude Sonnet 4

```
Any document (image/PDF)
        │
        ▼
┌─────────────────────┐
│  Claude Sonnet 4    │  ← One model for everything
│  (Vision + Text)    │
│                     │
│  • Reads document   │
│  • Extracts text    │
│  • Understands      │
│    medical context  │
│  • Returns JSON     │
└─────────────────────┘
        │
        ▼
   Structured data
```

**No separate OCR library. No tiered models. Just Claude.**

#### PDF Generation: @react-pdf/renderer (Decided)

| Decision | @react-pdf/renderer |
|----------|---------------------|
| Why | React components → PDF, no browser needed |
| Hosting | Works on Railway (Node.js) |
| Complexity | Simple, good for text-based layouts |
| Fallback | Puppeteer if complex designs needed later |

**Prescription format is text-based and structured.** @react-pdf/renderer is sufficient.

#### Document Types & Processing

| Document Type | Processing | Storage |
|---------------|------------|---------|
| Lab reports (PDF/image) | LLM Vision → extract values | Original + extracted text |
| ECG images | Store only (no interpretation) | Original file |
| X-rays | Store only (no interpretation) | Original file |
| Previous prescriptions | LLM Vision → extract meds | Original + extracted text |
| Discharge summaries | LLM Vision → summarize | Original + summary |

### Search

| Component | Technology | Why |
|-----------|------------|-----|
| **Patient Search** | Convex built-in | Simple, sufficient for v1 |
| **Document Search** | Convex full-text search | No external service needed |
| **Future (if needed)** | Algolia or Typesense | Only if search quality complaints |

**Principle:** Start simple. Add complexity only when needed.

### Monitoring & Analytics

| Component | Technology | Why |
|-----------|------------|-----|
| **Error Tracking** | Sentry (free tier) | Catch errors before users report |
| **Analytics** | Plausible or PostHog | Privacy-friendly, simple |
| **Logs** | Railway built-in | Sufficient for v1 |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RAILWAY HOSTING                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    NEXT.JS APPLICATION                        │ │
│  │                                                               │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │ │
│  │  │  API Routes │  │  EMR Pages  │  │  OpenClaw Service   │   │ │
│  │  │             │  │  (3-panel)  │  │  (WhatsApp bridge)  │   │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘   │ │
│  │         │                │                     │              │ │
│  │         └────────────────┼─────────────────────┘              │ │
│  │                          │                                    │ │
│  │                          ▼                                    │ │
│  │              ┌───────────────────────┐                        │ │
│  │              │   UNIFIED AI BRAIN    │                        │ │
│  │              │                       │                        │ │
│  │              │  • Claude Sonnet 4    │                        │ │
│  │              │  • Context manager    │                        │ │
│  │              │  • Permission layer   │                        │ │
│  │              │  • Medical guardrails │                        │ │
│  │              └───────────┬───────────┘                        │ │
│  │                          │                                    │ │
│  └──────────────────────────┼────────────────────────────────────┘ │
│                             │                                      │
└─────────────────────────────┼──────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CONVEX (DATABASE)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Tables:                    Files:                                  │
│  • doctors                  • prescriptions (PDF)                   │
│  • patients                 • documents (patient uploads)           │
│  • appointments             • attachments (images, ECGs)            │
│  • conversations                                                    │
│  • messages                                                         │
│  • prescriptions                                                    │
│  • payments                                                         │
│  • audit_log                                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Access Model (Security)

| Interface | Who | Data Access | Can Send Messages |
|-----------|-----|-------------|-------------------|
| Patient WhatsApp | Patient | Only their own records | To secretary only |
| Doctor WhatsApp | Doctor | All patients | Approvals, replies |
| EMR Web App | Doctor | All patients, full records | Prescriptions |
| Secretary (AI) | System | All data (for processing) | Only after rules/approval |

### Context Detection

```
If message from patient phone number:
  → Load only that patient's context
  → Never mention other patients
  → Cannot access other records

If message from doctor phone number:
  → Load full patient database
  → Can query any patient
  → Can approve any pending action

If request from EMR web app:
  → Doctor is authenticated
  → Full access to their patient database
  → Can view, edit, create prescriptions
```

---

## EMR Web App - 3 Panel Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│  Doctor Secretary AI                    Dr. [Name] ▼    [Logout]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┬─────────────────────────────┬───────────────────┐ │
│  │             │                             │                   │ │
│  │  PATIENT    │    PRESCRIPTION EDITOR      │   AI ASSISTANT    │ │
│  │  QUEUE      │                             │                   │ │
│  │             │  ┌───────────────────────┐  │  ┌─────────────┐  │ │
│  │  Today      │  │ Dr. [Name], [Degrees] │  │  │             │  │ │
│  │  ─────────  │  │ [Specialty]           │  │  │  Chat with  │  │ │
│  │             │  │ [Clinic Address]      │  │  │  Secretary  │  │ │
│  │  10:00 AM   │  │                       │  │  │             │  │ │
│  │  ● Ramesh K │  │ Date: [Auto]          │  │  │  "Patient   │  │ │
│  │    Fever    │  │ Patient: [Auto-fill]  │  │  │   has fever │  │ │
│  │             │  │                       │  │  │   5 days,   │  │ │
│  │  10:30 AM   │  │ ℞                     │  │  │   advise    │  │ │
│  │  ○ Priya S  │  │                       │  │  │   paracet-  │  │ │
│  │    Follow-up│  │ [Prescription area]   │  │  │   amol"     │  │ │
│  │             │  │                       │  │  │             │  │ │
│  │  11:00 AM   │  │ Investigations:       │  │  │     ↓       │  │ │
│  │  ○ Amit P   │  │ [Investigation area]  │  │  │             │  │ │
│  │    Chest... │  │                       │  │  │  [AI fills  │  │ │
│  │             │  │ Follow-up: [Date]     │  │  │   the Rx]   │  │ │
│  │  ─────────  │  │                       │  │  │             │  │ │
│  │  Pending    │  │ [Signature area]      │  │  └─────────────┘  │ │
│  │  ─────────  │  └───────────────────────┘  │                   │ │
│  │  2 patients │                             │  [Send WhatsApp]  │ │
│  │             │  [Print] [PDF] [Send]       │  [Send Email]     │ │
│  │             │                             │                   │ │
│  └─────────────┴─────────────────────────────┴───────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Prescription Template (Indian Format)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              DR. [FULL NAME], [MBBS, MD, DM, etc.]             │
│                       [SPECIALTY]                               │
│                     [CLINIC NAME]                               │
│                   [Address Line 1]                              │
│                   [Address Line 2]                              │
│                   Ph: [Contact Number]                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Date: __/__/____                                               │
│                                                                 │
│  Patient Name: _______________________  Age: ____  Sex: ____   │
│                                                                 │
│  Chief Complaints:                                              │
│  _____________________________________________________________  │
│                                                                 │
│  Diagnosis:                                                     │
│  _____________________________________________________________  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ℞                                                              │
│                                                                 │
│  1. ___________________________________________________        │
│     Dosage: ________ Duration: ________ Instructions: _____    │
│     [Hindi translation of instructions]                         │
│                                                                 │
│  2. ___________________________________________________        │
│     Dosage: ________ Duration: ________ Instructions: _____    │
│     [Hindi translation of instructions]                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Investigations Advised:                                        │
│  • ___________________                                          │
│  • ___________________                                          │
│                                                                 │
│  Special Instructions:                                          │
│  _____________________________________________________________  │
│                                                                 │
│  Follow-up: _______________                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                          ____________________   │
│                                          Dr. [Name]             │
│                                          Reg. No: [MCI/State]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Message Triage Logic

### Priority Levels

| Priority | Type | Action | Response Time |
|----------|------|--------|---------------|
| P0 | EMERGENCY | Immediate doctor alert + patient emergency message | < 1 minute |
| P1 | CLINICAL | Queue for doctor approval | Next check-in |
| P2 | ADMIN | Auto-respond or queue based on doctor preference | Within hours |
| P3 | INFO | Auto-respond with standard info | Immediate |

### Emergency Keywords (Cardiology v1)

```javascript
const EMERGENCY_KEYWORDS = [
  // Chest
  "chest pain", "chest discomfort", "seene mein dard", "सीने में दर्द",

  // Breathing
  "breathless", "breathlessness", "shortness of breath", "can't breathe",
  "saans nahi aa rahi", "सांस नहीं आ रही", "saans phool rahi",

  // Blood Pressure
  "very high bp", "bp bahut high", "blood pressure very high",

  // Syncope
  "fainted", "unconscious", "behosh", "गिर गया", "passed out",
  "blackout", "collapsed",

  // Cardiac Arrest
  "not responding", "unresponsive", "no pulse", "heart stopped",
  "cardiac arrest"
];
```

### Triage Flow

```
Incoming Message
      │
      ▼
┌─────────────┐
│ Check for   │──── EMERGENCY ────► P0: Immediate escalation
│ emergency   │                     • Alert doctor (call + WhatsApp)
│ keywords    │                     • Send emergency template to patient
└─────────────┘
      │
      │ Not emergency
      ▼
┌─────────────┐
│ LLM classify│──── CLINICAL ─────► P1: Queue for approval
│ intent      │                     • Draft response
│             │                     • Wait for doctor
└─────────────┘
      │
      │ Admin/Info
      ▼
┌─────────────┐
│ Check doctor│──── Autonomous ───► P3: Auto-respond
│ preference  │     mode enabled    • Appointment booking
└─────────────┘                     • Availability info
      │
      │ Confirmation required
      ▼
P2: Queue for confirmation
• Propose action to doctor
• Wait for approval
```

---

## Approval Flow (via WhatsApp)

Doctor receives:
```
📋 Appointment Request

Patient: Ramesh Kumar
Request: Appointment on 15th Jan, 10:30 AM
Message: "Doctor sahab, BP check karana hai"

Reply with:
✅ - Approve
❌ - Decline
📞 - Call patient
✏️ - Edit and approve
```

Doctor replies: `✅`

System:
1. Confirms appointment in database
2. Sends confirmation to patient
3. Generates UPI payment link
4. Logs action in audit trail

---

## Patient Record Schema (Convex)

```typescript
// schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  doctors: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    specialty: v.string(),
    qualifications: v.string(),
    clinicName: v.string(),
    clinicAddress: v.string(),
    registrationNumber: v.string(),
    // Settings
    adminApprovalMode: v.string(), // "autonomous" | "confirm"
    emergencyTemplate: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
  }),

  patients: defineTable({
    doctorId: v.id("doctors"),
    name: v.string(),
    phone: v.string(),
    whatsappId: v.string(),
    age: v.optional(v.number()),
    sex: v.optional(v.string()),
    email: v.optional(v.string()),
    // Medical
    allergies: v.optional(v.array(v.string())),
    comorbidities: v.optional(v.array(v.string())),
    currentMedications: v.optional(v.array(v.string())),
  }),

  conversations: defineTable({
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    channel: v.string(), // "whatsapp" | "email" | "emr"
    lastMessageAt: v.number(),
    summary: v.optional(v.string()),
  }),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.string(), // "patient" | "secretary" | "doctor"
    content: v.string(),
    attachments: v.optional(v.array(v.id("_storage"))),
    timestamp: v.number(),
    // Triage
    priority: v.optional(v.string()),
    intent: v.optional(v.string()),
    requiresApproval: v.boolean(),
    approved: v.optional(v.boolean()),
    approvedAt: v.optional(v.number()),
  }),

  appointments: defineTable({
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    dateTime: v.number(),
    status: v.string(), // "requested" | "confirmed" | "completed" | "cancelled"
    reason: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    paymentId: v.optional(v.string()),
  }),

  prescriptions: defineTable({
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    appointmentId: v.optional(v.id("appointments")),
    // Content
    chiefComplaints: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    historyOfPresentIllness: v.optional(v.string()),
    generalExamination: v.optional(v.string()),
    systemicExamination: v.optional(v.string()),
    medications: v.array(v.object({
      name: v.string(),
      dosage: v.string(),
      frequency: v.string(),
      duration: v.string(),
      instructions: v.optional(v.string()),
      instructionsHindi: v.optional(v.string()),
    })),
    investigations: v.optional(v.array(v.string())),
    specialInstructions: v.optional(v.string()),
    followUp: v.optional(v.string()),
    // Output
    pdfFileId: v.optional(v.id("_storage")),
    sentVia: v.optional(v.array(v.string())), // ["whatsapp", "email"]
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  }),

  documents: defineTable({
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(), // "pdf" | "image" | "ecg"
    category: v.optional(v.string()), // "lab_report" | "prescription" | "discharge_summary"
    extractedText: v.optional(v.string()),
    summary: v.optional(v.string()),
    uploadedAt: v.number(),
  }),

  payments: defineTable({
    doctorId: v.id("doctors"),
    patientId: v.id("patients"),
    appointmentId: v.id("appointments"),
    amount: v.number(),
    currency: v.string(),
    razorpayOrderId: v.optional(v.string()),
    razorpayPaymentId: v.optional(v.string()),
    status: v.string(), // "pending" | "completed" | "failed"
    receiptUrl: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }),

  auditLog: defineTable({
    doctorId: v.id("doctors"),
    action: v.string(),
    details: v.string(),
    performedBy: v.string(), // "doctor" | "secretary" | "system"
    timestamp: v.number(),
  }),
});
```

---

## Milestones (90 Days)

### Phase 1: Foundation (Weeks 1-2)

- [ ] Set up Convex project with schema
- [ ] Set up Next.js with shadcn/ui
- [ ] Deploy to Railway (basic)
- [ ] Implement doctor authentication (Convex Auth)
- [ ] Create basic EMR layout (3-panel, empty)

**Deliverable:** Doctor can log in, see empty 3-panel interface

### Phase 2: WhatsApp Secretary (Weeks 3-5)

- [ ] Set up OpenClaw with Baileys
- [ ] Connect to test WhatsApp number
- [ ] Implement message intake and storage
- [ ] Implement triage logic (emergency detection)
- [ ] Implement appointment workflow (request → approve → confirm)
- [ ] Connect WhatsApp to Convex database

**Deliverable:** Patient can message, secretary triages, doctor approves via WhatsApp

### Phase 3: Document Intelligence (Weeks 6-7)

- [ ] Implement file upload (patient sends via WhatsApp)
- [ ] Implement OCR via Gemini Vision
- [ ] Implement document summarization
- [ ] Implement document retrieval ("show me this patient's reports")

**Deliverable:** Secretary can receive, store, and summarize documents

### Phase 4: EMR App - Patient Queue (Week 8)

- [ ] Implement patient list view
- [ ] Show today's appointments
- [ ] Show pending requests
- [ ] Patient search functionality

**Deliverable:** Doctor sees patient queue in EMR

### Phase 5: EMR App - Prescription Editor (Weeks 9-10)

- [ ] Implement prescription form (all fields)
- [ ] Implement template-based letterhead
- [ ] Implement PDF generation
- [ ] Implement bilingual instructions (English + Hindi)
- [ ] Connect AI assistant to fill prescription from natural language

**Deliverable:** Doctor can write/generate prescriptions, export PDF

### Phase 6: EMR App - AI Assistant Panel (Week 11)

- [ ] Implement chat interface in EMR
- [ ] Connect to same AI brain as WhatsApp
- [ ] AI can fill prescription fields
- [ ] AI can fetch patient history
- [ ] AI can summarize previous visits

**Deliverable:** Doctor can chat with secretary in EMR, secretary fills prescription

### Phase 7: Delivery & Payments (Week 12)

- [ ] Send prescription via WhatsApp
- [ ] Send prescription via Email
- [ ] Implement Razorpay UPI integration
- [ ] Implement payment status tracking
- [ ] Generate receipts

**Deliverable:** Complete appointment-to-prescription-to-delivery flow

### Phase 8: Pilot Readiness (Week 13)

- [ ] Internal testing with your own number
- [ ] Fix bugs and edge cases
- [ ] Implement error handling
- [ ] Set up monitoring (Sentry)
- [ ] Onboard 3-5 pilot doctors

**Deliverable:** System ready for pilot

---

## Pre-Launch Requirements (After Pilot)

- [ ] Switch from Baileys to Official WhatsApp Business API
- [ ] Security audit
- [ ] Data backup strategy
- [ ] Doctor onboarding flow
- [ ] Billing/subscription system (Razorpay subscriptions)
- [ ] Support workflow

---

## Cost Projections

### Development Phase (Months 1-3)

| Item | Monthly Cost |
|------|--------------|
| Railway (Pro) | ₹800 ($10) |
| Convex (Free tier) | ₹0 |
| Claude Sonnet 4 (all LLM) | ₹1,000-2,000 |
| Whisper API (voice) | ₹100-200 |
| Domain | ₹100 |
| Resend (Email, free tier) | ₹0 |
| **Total** | **₹2,000-3,100/month** |

### Production Phase (Per Doctor)

| Item | Monthly Cost |
|------|--------------|
| Claude Sonnet 4 (all tasks) | ~₹300-500 |
| Whisper (voice, 100 minutes) | ~₹50 |
| WhatsApp Business API | ~₹500-1,000 |
| Storage (documents) | ~₹100 |
| Compute (share of infra) | ~₹200 |
| **Total per doctor** | **~₹1,150-1,850/month** |

At ₹15,000/month subscription: **~85-90% margin**

### AI Cost Breakdown (Per Doctor)

| Model | Task | Usage | Cost |
|-------|------|-------|------|
| Claude Sonnet 4 | Everything | ~1500 calls/month | ~₹300-500 |
| OpenAI Whisper | Voice transcription | 100 minutes | ~₹50 |
| **Total AI** | | | **~₹350-550/month** |

**Note:** If costs become a concern later, we can implement tiered approach (Claude for critical, cheaper model for routine). For now, ship with best quality.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| WhatsApp bans test number | Development blocked | Use dedicated test number, follow Baileys best practices |
| LLM hallucinates medical info | Patient harm, legal | Never auto-send clinical content, doctor approval required |
| Prompt injection | Data leak, wrong actions | Strict context boundaries, input sanitization |
| Razorpay integration issues | Can't collect payments | Start integration early, have manual backup |
| Doctor adoption resistance | No revenue | Free pilot, demonstrate clear value, easy onboarding |

---

## Decisions Made

| Question | Decision | Rationale |
|----------|----------|-----------|
| **LLM (all tasks)** | **Claude Sonnet 4** | **One model, best quality, simple** |
| Voice transcription | OpenAI Whisper | Best-in-class for Hindi |
| PDF generation | @react-pdf/renderer | Simple, no browser needed |
| UI language | English only | Doctors comfortable with English |
| SMS | Skip for v1 | WhatsApp + Email sufficient |
| Search | Convex built-in | Start simple |
| WhatsApp API provider | Decide at launch | Ease of setup is priority |

## Open Questions (Remaining)

1. **Doctor onboarding:** Self-serve or assisted setup?
2. **Teleconsultation:** Video call integration for v2?
3. **Lab integration:** Direct lab report fetching for v2?
4. **Prescription templates:** How customizable should letterhead be?

---

## Success Metrics (Pilot)

| Metric | Target |
|--------|--------|
| Messages handled without escalation | >70% |
| Doctor approval time (admin) | <5 minutes |
| Emergency detection accuracy | 100% |
| Prescription generation time | <2 minutes |
| Doctor satisfaction (NPS) | >8/10 |

---

## Team

| Role | Who |
|------|-----|
| Product & Domain Expert | You (Cardiologist) |
| Engineering | Claude Code |
| Testing & QA | You + Codex |
| Pilot Users | 3-5 doctor colleagues |

---

## Next Steps

1. **Initialize Convex project** with schema
2. **Set up Next.js** with shadcn/ui
3. **Deploy to Railway** (basic)
4. **Set up OpenClaw** with test WhatsApp
5. **Build message intake** flow

Ready to start building.
