# Doctor Secretary AI - Current TODO

## Session Goal
Week 6-8: Implement Documents + Records functionality (file uploads, OCR, document management).

## Current Plan

### Week 6-8: Documents + Records

#### Task 1: Implement file upload in WhatsApp adapter
- [ ] Add media message handling in WhatsApp adapter
- [ ] Download received images/PDFs from WhatsApp
- [ ] Store media metadata in Convex
- [ ] Emit events for document processing pipeline
- [ ] Test with manual image/PDF sends

#### Task 2: Create document ingestion service
- [ ] Create convex/documents.ts schema and mutations
- [ ] Build document processor service in services/
- [ ] Handle image and PDF file types
- [ ] Extract basic metadata (size, type, timestamp)
- [ ] Link documents to patient records
- [ ] Test document storage flow

#### Task 3: Implement OCR with Claude Vision
- [ ] Create OCR service using Claude Sonnet 4 Vision
- [ ] Process images to extract text
- [ ] Handle prescriptions, lab reports, medical records
- [ ] Store extracted text with document
- [ ] Parse structured data where possible
- [ ] Test with sample medical documents

#### Task 4: Create Convex file storage integration
- [ ] Set up Convex file storage
- [ ] Create upload/download mutations
- [ ] Generate secure URLs for file access
- [ ] Implement file size limits
- [ ] Handle storage cleanup for deleted documents
- [ ] Test file storage CRUD

#### Task 5: Build document viewer in EMR dashboard
- [ ] Add Documents tab/section to dashboard
- [ ] Create document list view with thumbnails
- [ ] Implement document preview modal
- [ ] Show extracted OCR text alongside document
- [ ] Add document metadata display
- [ ] Test viewer with various file types

#### Task 6: Implement patient record search
- [ ] Create full-text search on documents
- [ ] Search by patient name, document content, date
- [ ] Add search UI to dashboard
- [ ] Implement search result highlighting
- [ ] Test search functionality

#### Task 7: Build multi-document summarization
- [ ] Create AI service for document summarization
- [ ] Summarize multiple documents per patient
- [ ] Generate timeline view of patient history
- [ ] Show key findings and trends
- [ ] Test summarization quality

#### Task 8: Write tests for document flow
- [ ] Playwright tests for document upload UI
- [ ] Integration tests for WhatsApp media flow
- [ ] Tests for OCR processing
- [ ] Tests for search functionality
- [ ] End-to-end document journey test

## In Progress

### Task 1: Implement file upload in WhatsApp adapter
- [x] Add media message handling in WhatsApp adapter (getMediaDetails function)
- [x] Download received images/PDFs from WhatsApp (downloadMedia function)
- [x] Store media metadata in Convex (storeDocument mutation)
- [x] Create convex/documents.ts with full CRUD operations
- [ ] Test with manual image/PDF sends

## Completed

### Week 1-2: Foundation (COMPLETE)

#### Task #1: Initialize Convex Project ✅
Commit: c190f16 - Convex backend running locally at http://127.0.0.1:3210

#### Task #2: Create Complete Database Schema ✅
Commit: d7c0d6a - 9 tables, 26 indexes deployed successfully

#### Task #3: Initialize Next.js 14 ✅
Commit: 3dce8b4 - Next.js 16.1.6 running at localhost:3000

#### Task #4: shadcn/ui + Tailwind v4 ✅
Commit: 0d7f80d - 12 UI components installed, CSS variables configured

#### Task #5: Convex Auth ✅
Commit: 8c69264 - Password auth configured, ConvexAuthProvider ready

#### Task #6: Login/Signup Pages ✅
Commit: 1d03caf - 2-step signup, login, dashboard with auth check

#### Task #7: Railway Deployment ✅
Commit: f6277ee - railway.json configured, build passes

#### Task #8: Build 3-panel EMR Layout ✅
Commit: 385b6c7 - Responsive flexbox layout with left/middle/right panels

#### Task #9: Build Patient Queue Panel ✅
Commit: 14718e2 - Convex patients/appointments CRUD, real data display

#### Task #10: Build Prescription Editor Panel ✅
Commit: ecaedc3 - Full form with medications, investigations, save draft

#### Task #11: Build AI Assistant Panel ✅
Commit: 4760004 - Chat interface with doctor/secretary messages

#### Testing Infrastructure ✅
Commits: d724c08, d7a2769 - 24 passing tests (smoke, auth validation, dashboard)

### Week 3-5: WhatsApp + Triage (COMPLETE)

#### WhatsApp Adapter with Baileys ✅
Commits: 6c1974f, a960452 - Full WhatsApp connection via Baileys library
- QR code authentication
- Message sending/receiving
- Session persistence

#### Message Intake Pipeline ✅
Commit: 3e37ca1 - Receive messages → store in Convex → emit events

#### Emergency Keyword Detection & Triage ✅
Commit: db07511 - Rules-first detection for cardiac emergencies
- Chest pain, breathlessness, high BP, fainting, cardiac arrest keywords
- Hindi/English support
- Immediate escalation flow

#### Approval Queue UI ✅
Commit: 1af7635 - Dashboard shows pending approvals
- Approve/reject buttons
- Message preview

#### Appointment Request Workflow ✅
Commit: 52e6886 - Natural language appointment parsing
- Date/time extraction
- Patient matching
- Confirmation flow

#### Quick-Reply Approval via WhatsApp ✅
Commit: cd15ea6 - Doctor can approve messages directly from WhatsApp
- Reply with "ok" or "approve"
- Automatic sending to patient

## Blockers
<!-- Document any issues preventing progress -->

## Notes for Next Session
- Week 6-8 focuses on document handling
- Need to research Convex file storage capabilities
- OCR will use Claude Vision (Sonnet 4) for text extraction
- Consider document privacy and access control

---
*Last updated: 2024-02-04 - Starting Week 6-8*
