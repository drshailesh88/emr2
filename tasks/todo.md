# Doctor Secretary AI - Current TODO

## Session Goal
Initialize project infrastructure and complete Week 1-2 foundations.

## Current Plan

### Phase 0: Fix Directory Structure
- [ ] Move Spec Kit files from nested emr2/emr2 to emr2/
- [ ] Initialize git properly
- [ ] First commit with all planning documents

### Phase 1: Project Initialization
- [ ] Initialize Convex project
- [ ] Create database schema from docs/plan.md
- [ ] Initialize Next.js 14 with App Router
- [ ] Install and configure shadcn/ui + Tailwind
- [ ] Set up Convex Auth for doctors
- [ ] Create basic 3-panel EMR layout (empty structure)
- [ ] Deploy to Railway (basic)
- [ ] Set up Playwright for testing
- [ ] Write first smoke test (app loads)

## In Progress

### Task #2: Create Complete Database Schema ✅
- [x] Define doctors table (profile, settings, clinic info)
- [x] Define patients table (medical info, linked to doctor)
- [x] Define conversations table (message threads)
- [x] Define messages table (with triage metadata)
- [x] Define appointments table (scheduling, status)
- [x] Define prescriptions table (medications array)
- [x] Define documents table (file uploads, OCR data)
- [x] Define payments table (Razorpay tracking)
- [x] Define auditLog table (compliance logging)
- [x] Add indexes for common queries (26 indexes)
- [x] Verify schema deploys successfully

## Completed

### Task #1: Initialize Convex Project ✅
Commit: c190f16 - Convex backend running locally at http://127.0.0.1:3210

## Blockers
<!-- Document any issues preventing progress -->

## Notes for Next Session
<!-- Important context for continuation -->

---
*Last updated: Session not yet started*
