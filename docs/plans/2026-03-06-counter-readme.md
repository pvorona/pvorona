# Counter README Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite `packages/counter/README.md` so it is clearer for first-time readers while staying concise.

**Architecture:** This is a docs-only change. Keep the README structure small, replace the type-heavy example with one linear example, and make the method defaults and return values explicit.

**Tech Stack:** Markdown, Git, Nx (if the workspace install is available)

---

### Task 1: Rewrite the README

**Files:**
- Modify: `packages/counter/README.md`

**Step 1: Review the current README**

Read `packages/counter/README.md` and identify text that is harder to understand than the API itself.

**Step 2: Replace the usage example**

Use one short example that shows:
- the initial value
- `increment()` with the default amount
- `increment(amount)` with a custom amount
- `decrement()`
- `set(value)`
- reading `value`

**Step 3: Tighten the API section**

Document:
- `Counter`
- `createCounter(initialValue?: number): Counter`

Make sure the README says:
- `increment(amount?)` returns the updated value
- `decrement(amount?)` returns the updated value
- `set(value)` updates the current value

**Step 4: Save the doc change**

Keep the final README close in tone and size to the other small package READMEs in `packages/`.

---

### Task 2: Verify the docs change

**Files:**
- Modify: `packages/counter/README.md`

**Step 1: Run available verification**

Run:
- `git diff --check`
- `npm exec nx test counter`

Expected:
- `git diff --check` reports no whitespace or merge-marker issues
- `npm exec nx test counter` passes if the workspace dependencies are installed

**Step 2: Record blockers honestly**

If `npm exec nx test counter` cannot run because the workspace is not installed, record that explicitly instead of claiming it passed.

**Step 3: Commit**

Run:
- `git add packages/counter/README.md docs/plans/2026-03-06-counter-readme-design.md docs/plans/2026-03-06-counter-readme.md`
- `git commit -m "Update \`@pvorona/counter\` README"`
