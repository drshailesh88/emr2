# Claude Code Instructions for Doctor Secretary AI

## Project Overview

Building an AI-powered medical secretary for solo doctors in India. The system lives in WhatsApp (clinic number) and a web EMR (3-panel interface). It handles message triage, appointment coordination, document processing, and prescription drafting.

**Read these files for full context:**
- `docs/plan.md` - Master plan with tech stack, schema, milestones
- `docs/product-spec.md` - Features, non-goals, guardrails
- `docs/architecture.md` - Components, data model
- `docs/milestones.md` - 13-week breakdown
- `ANSWERS.md` + `ANSWERS2.md` - Domain expertise from the doctor

---

## Constitution (Non-Negotiable Rules)

1. **NEVER auto-prescribe** - No clinical advice without explicit doctor approval
2. **Emergency detection is rules-first** - Keyword matching for emergencies, LLM only for phrasing
3. **All code in TypeScript** - Strict mode enabled, proper types everywhere
4. **Convex for all database** - No raw SQL, use Convex queries and mutations
5. **Claude Sonnet 4 only** - One model for ALL AI tasks (simple, consistent)
6. **shadcn/ui components** - No custom UI from scratch
7. **Approval workflow required** - All clinical WhatsApp messages need doctor approval
8. **Audit log everything** - Every action that sends messages to patients must be logged
9. **Doctor-specific data** - Patient records are per-doctor (no clinic-wide sharing in v1)
10. **No manual edits to generated files** - Let Convex/tooling generate, don't hand-edit

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run Playwright tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Ralph Wiggum Protocol (Test-Fix Loop)

For each feature, follow this loop:

```
1. READ TASK
   └── Understand requirements from TaskList or docs/

2. PLAN (in tasks/todo.md)
   └── Write checkable items before implementation

3. IMPLEMENT
   └── Write the code following constitution rules

4. PLAYWRIGHT TEST (Act Like User)
   └── Navigate to page
   └── Perform user actions (click, type, submit)
   └── Verify expected outcomes

5. IF TEST FAILS:
   └── Capture the error
   └── Analyze root cause
   └── Fix the issue
   └── LOOP BACK TO STEP 4

6. IF TEST PASSES:
   └── Git commit with descriptive message
   └── Git push to GitHub (origin main)
   └── Update Task status to completed
   └── Move to next task
```

**Exit Conditions:**
- All Playwright tests pass, OR
- Blocker identified requiring human input (escalate to user)

**Safeguards:**
- Max 10 fix iterations per feature before asking for help
- Document each fix attempt in commit messages
- If stuck after 5 iterations, pause and reconsider approach

---

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

### Using Claude Code Tasks

```
TaskList          → See all tasks and their status
TaskGet <id>      → Get full details of a task
TaskCreate        → Create new task with subject, description, activeForm
TaskUpdate <id>   → Update status (pending → in_progress → completed)
```

**Dependencies:** Use `addBlockedBy` to chain tasks. Blocked tasks won't be picked up until dependencies complete.

---

## GitHub Repository

**Remote:** https://github.com/drshailesh88/emr2

### Git + GitHub Workflow

After every completed task:
```bash
git add .
git commit -m "feat: <description of what was built>"
git push origin main
```

**Commit message format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `docs:` - Documentation
- `chore:` - Setup, config, dependencies

**Push frequency:**
- Push after EVERY task completion
- Push before ending a session
- Push before switching to a different terminal

**Never force push to main.** If there are conflicts, pull first and resolve.

---

## Tech Stack Reference

| Component | Technology | Notes |
|-----------|------------|-------|
| Database | Convex | Real-time, TypeScript-only, no SQL |
| Hosting | Railway | Long-running processes, no cold starts |
| Frontend | Next.js 14 (App Router) | Use app/ directory |
| UI | shadcn/ui + Tailwind | Copy-paste components |
| Auth | Convex Auth | Integrated with database |
| AI | Claude Sonnet 4 | ONE model for everything |
| Voice | OpenAI Whisper | For Hindi transcription |
| WhatsApp (test) | OpenClaw + Baileys | Internal testing only |
| Payments | Razorpay | UPI + cards |
| PDF | @react-pdf/renderer | React components → PDF |
| Version Control | Git + GitHub | Push after every task |

---

## Session Start Checklist

1. Read `tasks/lessons.md` for patterns to follow/avoid
2. Read `tasks/todo.md` for current plan and progress
3. Run `TaskList` to see task progress
4. Read relevant docs/ files if context needed
5. Understand current state before making changes

## Session End Protocol

When context is filling up or switching tasks:
1. Commit all current work with clear message
2. **Push to GitHub** (`git push origin main`)
3. Update Task status (in_progress or completed)
4. Update `tasks/todo.md` with:
   - What was completed
   - What's next
   - Any blockers or notes
5. If mid-feature: note exactly where to continue

---

## Playwright Testing Guidelines

Every feature needs a test that acts like a user:

```typescript
// Example test structure
test('doctor can approve appointment request', async ({ page }) => {
  // 1. Navigate
  await page.goto('/dashboard');

  // 2. Perform user actions
  await page.click('[data-testid="pending-requests"]');
  await page.click('[data-testid="approve-btn"]');

  // 3. Verify outcomes
  await expect(page.locator('[data-testid="status"]')).toHaveText('Approved');
});
```

**Test categories:**
- Smoke tests: App loads, auth works
- Feature tests: Each feature works as expected
- Integration tests: Flows work end-to-end (message → triage → approval → response)

---

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Doctor Safety**: Never send clinical content without approval. This is non-negotiable.

---

## Emergency Keywords (Cardiology v1)

For triage, these MUST trigger immediate escalation:
```
chest pain, chest discomfort, seene mein dard, सीने में दर्द
breathless, breathlessness, shortness of breath, can't breathe
saans nahi aa rahi, सांस नहीं आ रही, saans phool rahi
very high bp, bp bahut high, blood pressure very high
fainted, unconscious, behosh, गिर गया, passed out, blackout, collapsed
not responding, unresponsive, no pulse, heart stopped, cardiac arrest
```

Use **rules-first** detection (string matching), not LLM classification for emergencies.
