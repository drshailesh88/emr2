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

### Task #5: Set up Convex Auth for doctors ✅
- [x] Install @convex-dev/auth and dependencies
- [x] Configure auth in convex/auth.ts
- [x] Set up password-based authentication
- [x] Create ConvexAuthProvider wrapper
- [x] Add auth tables to schema
- [x] Create users.ts with currentDoctor query

## Completed

### Task #1: Initialize Convex Project ✅
Commit: c190f16 - Convex backend running locally at http://127.0.0.1:3210

### Task #2: Create Complete Database Schema ✅
Commit: d7c0d6a - 9 tables, 26 indexes deployed successfully

### Task #3: Initialize Next.js 14 ✅
Commit: 3dce8b4 - Next.js 16.1.6 running at localhost:3000

### Task #4: shadcn/ui + Tailwind v4 ✅
Commit: 0d7f80d - 12 UI components installed, CSS variables configured

## Blockers
<!-- Document any issues preventing progress -->

## Notes for Next Session

<!-- Important context for continuation -->

---
*Last updated: Session not yet started*
