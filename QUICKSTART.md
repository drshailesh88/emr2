# Quick Start Guide - Doctor Secretary AI

## For Your Next Terminal

### Step 1: Fix Directory Structure (One-time)

```bash
cd /Users/shaileshsingh/emr2

# Move Spec Kit to correct location (it's nested in emr2/emr2)
mkdir -p .claude/commands
cp -r emr2/.claude/commands/* .claude/commands/ 2>/dev/null || true
cp -r emr2/.specify . 2>/dev/null || true

# Remove nested directory
rm -rf emr2/emr2

# Initialize git if needed
git init
git add .
git commit -m "Initial setup: planning docs, Spec Kit, CLAUDE.md"
```

### Step 2: Start Claude Code

```bash
cd /Users/shaileshsingh/emr2
CLAUDE_CODE_TASK_LIST_ID=doctor-secretary claude
```

### Step 3: First Commands

**Option A - Start Fresh with Constitution:**
```
Read docs/plan.md and ANSWERS.md.
Run /constitution to establish our project rules.
Then create Tasks for Week 1-2 from docs/milestones.md.
```

**Option B - Jump Straight to Implementation:**
```
Read CLAUDE.md for the constitution and rules.
Read docs/plan.md for context.
Read tasks/todo.md for the current plan.

Create the following Tasks:
1. Initialize Convex project
2. Create database schema (doctors, patients, conversations, messages, prescriptions)
3. Set up Next.js 14 with App Router
4. Install shadcn/ui and Tailwind
5. Create basic 3-panel layout
6. Implement Convex Auth for doctors
7. Deploy to Railway
8. Set up Playwright testing
9. Write first smoke test

Then start with Task 1.
```

### Step 4: The Implementation Loop

For each task, Claude Code will:
1. Read the task requirements
2. Write plan to `tasks/todo.md`
3. Implement the feature
4. Write Playwright test
5. Run test → if fail → fix → retest (Ralph Wiggum loop)
6. If pass → commit → mark complete → next task

### Step 5: Starting New Sessions

When you open a new Claude Code session:
```
Read tasks/lessons.md first.
Read tasks/todo.md for state.
Run TaskList to see progress.
Continue from where we left off.
```

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Rules for Claude Code (auto-loaded) |
| `docs/plan.md` | Master plan, tech stack, schema |
| `docs/product-spec.md` | Features and guardrails |
| `docs/architecture.md` | System components |
| `docs/milestones.md` | 13-week timeline |
| `tasks/todo.md` | Current session plan |
| `tasks/lessons.md` | Patterns learned from corrections |

## Your Role

- Review completed features
- Give corrections (updates lessons.md automatically)
- Answer domain questions
- Approve/reject implementations
- Steer direction when needed

**You don't write code. You steer.**
